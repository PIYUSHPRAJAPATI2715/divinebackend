const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Banner = require('../models/Banner');
const CampaignCategory = require('../models/CampaignCategory');
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const NewsMedia = require('../models/NewsMedia');
const { resolveEntityPhoto, enrichEntityPhotos } = require('../utils/avatar');
const { calculateNgoDynamicRating } = require('../utils/rating');
const { syncExpiredCampaigns, calculateDaysLeft, isCampaignExpired, getActiveCampaignsQuery } = require('../utils/campaignHelper');

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

    // 1.5 Auto-transition any expired campaigns to Completed
    await syncExpiredCampaigns();

    // 2. Fetch categories
    const categories = await CampaignCategory.find().sort({ name: 1 });

    // 3. Fetch active banners (filter placement = 'Home' and status = 'Active')
    const banners = await Banner.find({ placement: 'Home', status: 'Active' });

    // 4. Fetch ongoing active unexpired campaigns (status = 'Live', active, verified, unexpired)
    const campaigns = await Campaign.find(getActiveCampaignsQuery()).sort({ createdAt: -1 });

    // 5. Fetch top NGOs (verified NGOs, excluding corporate profiles and self-NGO profile)
    let selfNgoId = null;
    let selfNgoPhone = null;
    let selfNgoEmail = null;
    if (req.user && (req.user.id || req.user._id)) {
      const currentUserId = req.user.id || req.user._id;
      const currentUser = await User.findById(currentUserId);
      if (currentUser) {
        selfNgoPhone = currentUser.phone;
        selfNgoEmail = currentUser.email;
        const myNgo = await NGO.findOne({
          $or: [
            { phone: currentUser.phone },
            { email: currentUser.email }
          ]
        });
        if (myNgo) selfNgoId = myNgo._id;
      }
    }

    const ngoFilter = {
      status: 'Verified',
      organizationType: { $ne: 'Corporate' },
      isRegisteredCompany: { $ne: 'Yes' }
    };

    if (selfNgoId) {
      ngoFilter._id = { $ne: selfNgoId };
    }
    if (selfNgoPhone && selfNgoPhone.trim()) {
      ngoFilter.phone = { $ne: selfNgoPhone.trim() };
    }
    if (selfNgoEmail && selfNgoEmail.trim()) {
      ngoFilter.email = { $ne: selfNgoEmail.trim() };
    }

    const topNGOs = await NGO.find(ngoFilter)
      .select('name organizationName logo rating impactStats about email phone')
      .sort({ rating: -1 })
      .limit(10);

    // 5b. Fetch Press & Media (Published articles)
    const pressAndMediaDocs = await NewsMedia.find({ status: 'Published' })
      .sort({ publishedDate: -1, createdAt: -1 })
      .limit(10);

    const pressAndMedia = pressAndMediaDocs.map(item => {
      const img = item.imageUrl || item.image || item.mediaUrl || '';
      return {
        _id: item._id,
        id: item._id,
        newsId: item.newsId,
        title: item.title,
        source: item.source,
        content: item.content,
        imageUrl: img,
        image: img,
        mediaUrl: img,
        publishedDate: item.publishedDate,
        date: item.publishedDate,
        status: item.status
      };
    });

    // 6. Fetch recent successful donations on the platform (last 10 recent donation transactions, excluding wallet topups)
    const recentTx = await Transaction.find({
      type: 'Donation',
      status: 'Success',
      item: { $not: /wallet|top-up|topup|recharge|cashback|refund/i }
    })
    .sort({ date: -1, createdAt: -1, _id: -1 })
    .limit(10);

    const recentDonationsList = await Promise.all(recentTx.map(async tx => {
      let donorName = (tx.user && tx.user.trim() !== '' && tx.user !== 'User') ? tx.user.trim() : 'Anonymous Donor';
      let donorPhoto = resolveEntityPhoto({ name: donorName }, 'user');
      if (tx.userId) {
        const u = await User.findById(tx.userId).select('name profilePhoto logo');
        if (u) {
          if (!tx.user || tx.user === 'User' || tx.user === 'Anonymous Donor') donorName = u.name || donorName;
          donorPhoto = resolveEntityPhoto(u, 'user');
        }
      }
      return {
        _id: tx._id,
        id: tx._id,
        transactionId: tx.transactionId,
        user: donorName,
        userName: donorName,
        user_name: donorName,
        donor: donorName,
        donorName: donorName,
        donor_name: donorName,
        donatedBy: donorName,
        donated_by: donorName,
        name: donorName,
        item: tx.item,
        amount: tx.amount,
        formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
        status: tx.status,
        date: tx.date || tx.createdAt,
        createdAt: tx.date || tx.createdAt,
        image: donorPhoto,
        donorImage: donorPhoto,
        userImage: donorPhoto,
        profilePhoto: donorPhoto
      };
    }));

const DanDonation = require('../models/DanDonation');

    const donationHistory = recentDonationsList;

    // Calculate total donate amount and personal donations for the currently logged in user
    let userTotalDonateAmount = 0;
    let userPersonalDonations = [];
    if (req.user && (req.user._id || req.user.id)) {
      const userId = req.user._id || req.user.id;
      const dbUser = await User.findById(userId);
      if (dbUser) {
        const userTxResults = await Transaction.aggregate([
          {
            $match: {
              type: 'Donation',
              status: 'Success',
              item: { $not: /wallet|top-up|topup|recharge|cashback|refund/i },
              userId: dbUser._id
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const userDanResults = await DanDonation.aggregate([
          {
            $match: {
              paymentStatus: 'Success',
              donorId: dbUser._id
            }
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        const txTotal = (userTxResults.length > 0 && typeof userTxResults[0].total === 'number') ? userTxResults[0].total : 0;
        const danTotal = (userDanResults.length > 0 && typeof userDanResults[0].total === 'number') ? userDanResults[0].total : 0;
        userTotalDonateAmount = txTotal + danTotal;

        const myTx = await Transaction.find({
          type: 'Donation',
          status: 'Success',
          userId: dbUser._id,
          item: { $not: /wallet|top-up|topup|recharge|cashback|refund/i }
        }).sort({ date: -1, createdAt: -1 }).limit(5).lean();

        const myDan = await DanDonation.find({
          donorId: dbUser._id,
          paymentStatus: 'Success'
        }).sort({ createdAt: -1 }).limit(5).lean();

        const userDisplayName = dbUser.name || 'You';
        const userPhoto = resolveEntityPhoto(dbUser, 'user');

        userPersonalDonations = [
          ...myTx.map(tx => ({
            _id: tx._id,
            id: tx._id,
            transactionId: tx.transactionId || '',
            user: userDisplayName,
            userName: userDisplayName,
            user_name: userDisplayName,
            donor: userDisplayName,
            donorName: userDisplayName,
            donor_name: userDisplayName,
            donatedBy: userDisplayName,
            donated_by: userDisplayName,
            name: userDisplayName,
            item: tx.item || 'Donation',
            amount: tx.amount || 0,
            formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
            status: tx.status || 'Success',
            date: tx.date || tx.createdAt,
            createdAt: tx.date || tx.createdAt,
            image: userPhoto,
            donorImage: userPhoto,
            userImage: userPhoto,
            profilePhoto: userPhoto
          })),
          ...myDan.map(d => ({
            _id: d._id,
            id: d._id,
            transactionId: d.transactionId || d.receiptNumber || '',
            user: userDisplayName,
            userName: userDisplayName,
            user_name: userDisplayName,
            donor: userDisplayName,
            donorName: userDisplayName,
            donor_name: userDisplayName,
            donatedBy: userDisplayName,
            donated_by: userDisplayName,
            name: userDisplayName,
            item: (d.items && d.items[0]?.name) || 'Daan Contribution',
            amount: d.totalAmount || 0,
            formattedAmount: `₹${(d.totalAmount || 0).toLocaleString('en-IN')}`,
            status: d.paymentStatus || 'Success',
            date: d.createdAt,
            createdAt: d.createdAt,
            image: userPhoto,
            donorImage: userPhoto,
            userImage: userPhoto,
            profilePhoto: userPhoto
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
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
        campaigns: (await Promise.all(campaigns.map(async c => {
          const now = new Date();
          if (isCampaignExpired(c, now)) {
            return null;
          }
          const days = calculateDaysLeft(c, now);
          if (days <= 0 && c.endDate && new Date(c.endDate) <= now) {
            return null;
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
          const creatorPhoto = resolveEntityPhoto(creatorNGO || creatorUser, creatorNGO ? 'ngo' : 'user');

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
            category: c.category,
            imageUrl: finalImage,
            goal: c.goal,
            raised: c.raised,
            donorsCount: c.donorsCount || 0,
            daysLeft: days,
            description: c.description,
            activate: true,
            active: true,
            isActive: true,
            is_active: true,
            activated: true,
            verify: true,
            verified: true,
            isVerified: true,
            is_verified: true,
            verificationStatus: 'Approved',
            status: c.status
          };
        }))).filter(Boolean),
        ngos: await Promise.all(topNGOs.map(async ngo => {
          const dynamicRating = await calculateNgoDynamicRating(ngo);
          const photos = enrichEntityPhotos(ngo, 'ngo');
          return {
            id: ngo._id,
            _id: ngo._id,
            name: ngo.name || ngo.organizationName || 'NGO',
            organizationName: ngo.organizationName || ngo.name || 'NGO',
            rating: dynamicRating.rating,
            ratingValue: dynamicRating.rating,
            averageRating: dynamicRating.rating,
            reviewsCount: dynamicRating.reviewsCount,
            reviewCount: dynamicRating.reviewsCount,
            totalReviews: dynamicRating.reviewsCount,
            impactStats: ngo.impactStats || '',
            description: ngo.about || '',
            about: ngo.about || '',
            ...photos
          };
        })),
        pressAndMedia,
        pressMedia: pressAndMedia,
        newsAndMedia: pressAndMedia,
        newsMedia: pressAndMedia,
        press: pressAndMedia,
        // Platform Recent Public Donors (Home Page Widget)
        recentDonors: recentDonationsList,
        recentDonorTransactions: recentDonationsList,
        recentDonations: recentDonationsList,
        recentTransactions: recentDonationsList,
        donorTransactions: recentDonationsList,
        platformRecentDonations: recentDonationsList,
        platformDonations: recentDonationsList,
        recentDonorsList: recentDonationsList,
        donationHistory: recentDonationsList,
        // User's Personal Donations (Empty for new accounts)
        myDonations: userPersonalDonations,
        myDonationHistory: userPersonalDonations,
        userDonationHistory: userPersonalDonations
      }
    });

  } catch (err) {
    console.error('Homepage API error:', err);
    res.status(500).json({ status: false, message: 'Failed to compile home page data: ' + err.message });
  }
});

module.exports = router;
