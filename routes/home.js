const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Banner = require('../models/Banner');
const CampaignCategory = require('../models/CampaignCategory');
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');

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
    let donationHistory = [];

    // 1. If user is authenticated, retrieve user and their transaction history
    if (req.user && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser) {
        userProfile = {
          id: dbUser._id,
          phone: dbUser.phone,
          name: dbUser.name || dbUser.organizationName || 'User',
          role: dbUser.role,
          walletBalance: dbUser.walletBalance || 0
        };

        // Fetch user's recent transactions (specifically Donations)
        const recentTx = await Transaction.find({
          type: 'Donation',
          user: dbUser.name || dbUser.phone
        })
        .sort({ date: -1 })
        .limit(10);

        donationHistory = recentTx.map(tx => ({
          transactionId: tx.transactionId,
          item: tx.item,
          amount: tx.amount,
          status: tx.status,
          date: tx.date,
          createdAt: tx.createdAt
        }));
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

    res.json({
      status: true,
      data: {
        user: userProfile,
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
          description: c.description
        })),
        campaigns: campaigns.map(c => ({
          campaignId: c.campaignId,
          title: c.title,
          user: c.user,
          category: c.category,
          imageUrl: c.imageUrl,
          goal: c.goal,
          raised: c.raised,
          donorsCount: c.donorsCount,
          daysLeft: c.daysLeft,
          description: c.description
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
        appVersion: 'v1.0.1_ngo_fix'
      }
    });

  } catch (err) {
    console.error('Homepage API error:', err);
    res.status(500).json({ status: false, message: 'Failed to compile home page data: ' + err.message });
  }
});

module.exports = router;
