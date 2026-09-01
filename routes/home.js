const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Banner = require('../models/Banner');
const CampaignCategory = require('../models/CampaignCategory');
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

// Helper middleware to optionally extract user from JWT token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.log('Lenient auth failed:', err.message);
    }
  }
  next();
};

router.get('/', optionalAuth, async (req, res) => {
  try {
    let userProfile = null;

    let isRead = true; // default true if not authenticated

    // 1. If user is authenticated, retrieve user
    if (req.user && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser) {
        // If there are unread notifications, isRead is false
        const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
        isRead = unreadCount === 0;

        const userSearchHistory = dbUser.searchHistory || [];
        userProfile = {
          id: dbUser._id,
          phone: dbUser.phone,
          name: dbUser.name || dbUser.organizationName || 'User',
          role: dbUser.role,
          walletBalance: dbUser.walletBalance || 0,
          searchHistory: userSearchHistory,
          recentSearches: userSearchHistory,
          isRead // attached to user profile
        };
      }
    }

    // 2. Fetch categories
    const categories = await CampaignCategory.find().sort({ name: 1 });

    // 3. Fetch active banners (filter placement = 'Home' and status = 'Active')
    const banners = await Banner.find({ placement: 'Home', status: 'Active' });

    // 4. Fetch ongoing campaigns (status = 'Live')
    const campaigns = await Campaign.find({ status: 'Live' }).sort({ createdAt: -1 });

    // 5. Fetch top NGOs (verified NGOs from NGO collection)
    const topNGOs = await NGO.find({ status: 'Verified' })
      .select('name logo rating impactStats about email phone')
      .limit(10);

    // 6. Fetch recent successful donations on the platform (last 10 recent donation transactions, excluding wallet topups)
    const recentTx = await Transaction.find({
      type: 'Donation',
      status: 'Success',
      item: { $not: /wallet|top-up|topup|recharge|cashback|refund/i }
    })
    .sort({ date: -1 })
    .limit(10);

    const donationHistory = recentTx.map(tx => ({
      transactionId: tx.transactionId,
      user: tx.user,
      donor: tx.user,
      item: tx.item,
      amount: tx.amount,
      formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
      status: tx.status,
      date: tx.date || tx.createdAt,
      createdAt: tx.date || tx.createdAt
    }));

    // Calculate total donate amount for the currently logged in user
    let userTotalDonateAmount = 0;
    if (req.user && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser) {
        const userTxResults = await Transaction.aggregate([
          {
            $match: {
              type: 'Donation',
              status: 'Success',
              item: { $ne: 'Wallet Top-up' },
              $or: [
                { mobile: dbUser.phone },
                { mobile: `+91 ${dbUser.phone}` },
                { user: dbUser.name }
              ]
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        if (userTxResults.length > 0 && typeof userTxResults[0].total === 'number' && !isNaN(userTxResults[0].total)) {
          userTotalDonateAmount = userTxResults[0].total;
        }
      }
    }

    // Platform-wide donation total
    const platformDonateResult = await Transaction.aggregate([
      { $match: { type: 'Donation', status: 'Success', item: { $ne: 'Wallet Top-up' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const platformTotalDonateAmount = (platformDonateResult.length > 0 && typeof platformDonateResult[0].total === 'number' && !isNaN(platformDonateResult[0].total)) ? platformDonateResult[0].total : 0;

    res.json({
      status: true,
      data: {
        user: userProfile,
        isRead, // root-level indicator for notification bell
        totalDonateAmount: userTotalDonateAmount,
        platformTotalDonateAmount,
        banners: banners.map(b => ({
          bannerId: b.bannerId,
          title: b.title,
          imageUrl: b.imageUrl,
          linkUrl: b.linkUrl
        })),
        categories: categories.map(c => ({
          categoryId: c.categoryId,
          name: c.name,
          icon: c.icon,
          imageUrl: c.imageUrl || '',
          description: c.description
        })),
        campaigns: await Promise.all(campaigns.map(async c => {
          let days = c.daysLeft || 30;
          if (c.endDate) {
            const diffTime = new Date(c.endDate) - new Date();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          } else if (c.createdAt) {
            const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
          let finalImage = '';
          if (Array.isArray(c.images)) {
            const uploadedImg = c.images.find(img => typeof img === 'string' && img.trim() !== '' && !img.includes('unsplash.com'));
            if (uploadedImg) finalImage = uploadedImg;
          }

          if (!finalImage && c.imageUrl && typeof c.imageUrl === 'string' && c.imageUrl.trim() !== '' && !c.imageUrl.includes('unsplash.com')) {
            finalImage = c.imageUrl.trim();
          }

          if (!finalImage && Array.isArray(c.images)) {
            const anyImg = c.images.find(img => typeof img === 'string' && img.trim() !== '');
            if (anyImg) finalImage = anyImg.trim();
          }

          if (!finalImage) {
            finalImage = (c.imageUrl && typeof c.imageUrl === 'string') ? c.imageUrl.trim() : '';
          }

          let creatorNGO = null;
          let creatorUser = null;
          if (c.userId) creatorUser = await User.findById(c.userId);
          if (c.ngoId) creatorNGO = await NGO.findById(c.ngoId);
          if (!creatorUser && !creatorNGO && c.user && c.user !== 'Divine Donor' && c.user !== 'Divine Owner') {
            const cleanUser = c.user.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            creatorNGO = await NGO.findOne({
              $or: [
                { name: { $regex: new RegExp(`^${cleanUser}$`, 'i') } },
                { organizationName: { $regex: new RegExp(`^${cleanUser}$`, 'i') } }
              ]
            });
            creatorUser = await User.findOne({
              $or: [
                { name: { $regex: new RegExp(`^${cleanUser}$`, 'i') } },
                { organizationName: { $regex: new RegExp(`^${cleanUser}$`, 'i') } }
              ]
            });
          }
          if (!creatorUser && !creatorNGO) {
            creatorNGO = await NGO.findOne({ status: 'Verified' });
          }

          const creatorName = creatorNGO?.name || creatorUser?.name || c.user || 'Divine Organizer';
          const creatorPhoto = creatorNGO?.logo || creatorUser?.profilePhoto || creatorUser?.logo || 'https://files.catbox.moe/q4i0t0.jpg';

          const profileObj = {
            _id: creatorNGO?._id || creatorUser?._id || c._id,
            name: creatorName,
            organizationName: creatorName,
            phone: creatorNGO?.phone || creatorUser?.phone || '',
            email: creatorNGO?.email || creatorUser?.email || '',
            role: creatorNGO ? 'ngo' : (creatorUser?.role || 'ngo'),
            profilePhoto: creatorPhoto,
            logo: creatorPhoto,
            registeredAddress: creatorNGO?.registeredAddress || creatorUser?.registeredAddress || ''
          };

          return {
            _id: c._id,
            campaignId: c.campaignId,
            title: c.title,
            user: creatorName,
            userName: creatorName,
            user_name: creatorName,
            creatorName: creatorName,
            creator_name: creatorName,
            fundraiserName: creatorName,
            fundraiser_name: creatorName,
            fundraiser: creatorName,
            userImage: creatorPhoto,
            user_image: creatorPhoto,
            userLogo: creatorPhoto,
            profilePhoto: creatorPhoto,
            creatorImage: creatorPhoto,
            creatorPhoto: creatorPhoto,
            fundraiserImage: creatorPhoto,
            fundraiser_image: creatorPhoto,
            fundraiserLogo: creatorPhoto,
            fundraiserPhoto: creatorPhoto,
            userProfile: profileObj,
            creatorProfile: profileObj,
            fundraiserProfile: profileObj,
            category: c.category,
            imageUrl: finalImage,
            goal: c.goal,
            raised: c.raised,
            donorsCount: c.donorsCount || 0,
            daysLeft: days,
            description: c.description
          };
        })),
        ngos: topNGOs.map(ngo => ({
          id: ngo._id,
          name: ngo.name,
          logo: ngo.logo,
          rating: ngo.rating || 4.5,
          impactStats: ngo.impactStats || '',
          description: ngo.about || ''
        })),
        donationHistory,
        appVersion: 'v1.0.5_onboarding_role_fix'
      }
    });

  } catch (err) {
    console.error('Homepage API error:', err);
    res.status(500).json({ status: false, message: 'Failed to compile home page data: ' + err.message });
  }
});

module.exports = router;
