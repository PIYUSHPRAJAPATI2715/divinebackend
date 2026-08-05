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

        userProfile = {
          id: dbUser._id,
          phone: dbUser.phone,
          name: dbUser.name || dbUser.organizationName || 'User',
          role: dbUser.role,
          walletBalance: dbUser.walletBalance || 0,
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

    // 6. Fetch recent successful donations on the platform (limited to 5)
    const recentTx = await Transaction.find({
      type: 'Donation',
      status: 'Success'
    })
    .sort({ date: -1 })
    .limit(5);

    const donationHistory = recentTx.map(tx => ({
      transactionId: tx.transactionId,
      user: tx.user,
      donor: tx.user,
      item: tx.item,
      amount: tx.amount,
      status: tx.status,
      date: tx.date,
      createdAt: tx.createdAt
    }));

    // Calculate total donate amount on platform from successful transactions
    const totalDonateResult = await Transaction.aggregate([
      { $match: { type: 'Donation', status: 'Success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDonateAmount = totalDonateResult.length > 0 ? totalDonateResult[0].total : 0;

    res.json({
      status: true,
      data: {
        user: userProfile,
        isRead, // root-level indicator for notification bell
        totalDonateAmount,
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
        campaigns: campaigns.map(c => {
          let days = c.daysLeft || 30;
          if (c.endDate) {
            const diffTime = new Date(c.endDate) - new Date();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          } else if (c.createdAt) {
            const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
            days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
          return {
            _id: c._id,
            campaignId: c.campaignId,
            title: c.title,
            user: c.user,
            category: c.category,
            imageUrl: (c.imageUrl && c.imageUrl.trim() !== '') ? c.imageUrl.trim() : (c.images && c.images.length > 0 ? c.images[0] : ''),
            goal: c.goal,
            raised: c.raised,
            donorsCount: c.donorsCount || 0,
            daysLeft: days,
            description: c.description
          };
        }),
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
