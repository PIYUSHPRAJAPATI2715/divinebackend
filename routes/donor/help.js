const express = require('express');
const router = express.Router();
const NGO = require('../../models/NGO');
const User = require('../../models/User');
const Review = require('../../models/Review');
const Referral = require('../../models/Referral');
const SupportTicket = require('../../models/SupportTicket');
const Coupon = require('../../models/Coupon');
const Notification = require('../../models/Notification');
const Transaction = require('../../models/Transaction');
const Content = require('../../models/Content');

// NGO lists
router.get('/ngos', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { status: 'Verified' };
    
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const regex = new RegExp(trimmedSearch, 'i');
      query.$or = [
        { name: regex },
        { contactPerson: regex },
        { about: regex }
      ];
      
      // Save to user's search history
      if (req.user && req.user._id) {
        const user = await User.findById(req.user._id);
        if (user) {
          if (!user.searchHistory) user.searchHistory = [];
          user.searchHistory = user.searchHistory.filter(t => t.toLowerCase() !== trimmedSearch.toLowerCase());
          user.searchHistory.unshift(trimmedSearch);
          if (user.searchHistory.length > 10) user.searchHistory.pop();
          await user.save();
        }
      }
    }

    const ngos = await NGO.find(query).sort({ createdAt: -1 });
    res.json({ status: true, data: ngos });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/ngos/:id', async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) {
      return res.status(404).json({ status: false, message: 'NGO details not found' });
    }
    res.json({ status: true, data: ngo });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    let notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    if (notifications.length === 0) {
      const welcome = new Notification({
        user: req.user._id,
        title: 'Welcome to Divine Nakshatra!',
        message: 'Explore verified campaigns, astrogical courses, and sponsor change today.'
      });
      const walletInit = new Notification({
        user: req.user._id,
        title: 'Wallet Activated',
        message: 'Your wallet has been activated with a starting balance of ₹100!'
      });
      await welcome.save();
      await walletInit.save();
      notifications = [walletInit, welcome];
    }
    res.json({ status: true, data: notifications });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { isRead: true });
    res.json({ status: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Recent Searches
router.get('/recent-searches', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const history = user.searchHistory && user.searchHistory.length > 0
      ? user.searchHistory
      : ['Medical help', 'Child education', 'Astrology courses', 'NGO Support'];
    res.json({ status: true, data: history });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/recent-searches', async (req, res) => {
  try {
    const { term } = req.body;
    if (!term || !term.trim()) {
      return res.status(400).json({ status: false, message: 'Search term is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    if (!user.searchHistory) user.searchHistory = [];
    user.searchHistory = user.searchHistory.filter(t => t.toLowerCase() !== term.trim().toLowerCase());
    user.searchHistory.unshift(term.trim());
    if (user.searchHistory.length > 10) user.searchHistory.pop();
    await user.save();
    res.json({ status: true, data: user.searchHistory });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Coupons
router.get('/coupons', async (req, res) => {
  try {
    let coupons = await Coupon.find({ isActive: true });
    if (coupons.length === 0) {
      const c1 = new Coupon({
        code: 'WELCOME100',
        description: 'Get ₹100 cashback bonus inside your wallet on your first transaction.',
        discountType: 'Flat',
        value: 100,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      });
      const c2 = new Coupon({
        code: 'DIVINE50',
        description: 'Sponsor a cause and get an immediate 50% reward booster matching.',
        discountType: 'Percentage',
        value: 50,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      const c3 = new Coupon({
        code: 'CHARITY20',
        description: 'Unlock 20% discount coupon on spiritual courses catalog.',
        discountType: 'Percentage',
        value: 20,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      });
      await c1.save();
      await c2.save();
      await c3.save();
      coupons = [c1, c2, c3];
    }
    const user = await User.findById(req.user._id);
    const claimedCodes = user ? user.couponsClaimed || [] : [];
    const mappedCoupons = coupons.map(c => {
      const obj = c.toObject ? c.toObject() : c;
      if (claimedCodes.includes(obj.code)) {
        obj.isActive = false;
      }
      return obj;
    });
    res.json({ status: true, data: mappedCoupons });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/coupons/claim', async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon) {
      return res.status(404).json({ status: false, message: 'Invalid or expired coupon code' });
    }
    if (user.couponsClaimed.includes(code)) {
      return res.status(400).json({ status: false, message: 'You have already claimed this coupon' });
    }
    user.couponsClaimed.push(code);
    if (coupon.discountType === 'Flat') {
      user.walletBalance = (user.walletBalance || 0) + coupon.value;
      const tx = new Transaction({
        transactionId: `TXN-${Date.now().toString().slice(-4)}`,
        type: 'Donation',
        user: user.name || user.phone,
        amount: Number(coupon.value),
        status: 'Success',
        item: `Coupon Cashback: ${code}`
      });
      await tx.save();
    }
    await user.save();
    const notification = new Notification({
      user: user._id,
      title: 'Coupon Claimed',
      message: `Coupon ${code} claimed successfully! Applied ${coupon.discountType === 'Flat' ? '₹' + coupon.value + ' wallet bonus' : coupon.value + '% reward booster'}.`
    });
    await notification.save();
    res.json({ status: true, message: 'Coupon claimed successfully!', data: user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Reviews
router.get('/reviews', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const reviews = await Review.find({ userName: user.name || user.phone }).sort({ createdAt: -1 });
    res.json({ status: true, data: reviews });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    const { type, targetName, rating, comment } = req.body;
    if (!type || !targetName || !rating || !comment) {
      return res.status(400).json({ status: false, message: 'All review fields are required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const newReview = new Review({
      reviewId: `REV-${Date.now().toString().slice(-4)}`,
      userName: user.name || 'Divine Donor',
      userRole: 'Donor',
      type,
      targetName,
      rating: Number(rating),
      comment,
      status: 'Approved'
    });
    await newReview.save();
    res.status(201).json({ status: true, message: 'Review submitted successfully', data: newReview });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Referrals
router.get('/referrals', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const referrals = await Referral.find({ referrerName: user.name || user.phone }).sort({ createdAt: -1 });
    const totalEarnings = referrals
      .filter(r => r.status === 'Completed')
      .reduce((sum, r) => sum + r.rewardAmount, 0);
    res.json({
      status: true,
      data: {
        referralCode: user.referralCode,
        referrals,
        totalEarnings,
        referredCount: referrals.length
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Help Tickets
router.get('/help-support', async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ status: true, data: tickets });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/help-support', async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ status: false, message: 'Subject and Message are required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const ticket = new SupportTicket({
      ticketId: `TCK-${Date.now().toString().slice(-4)}`,
      user: user._id,
      userName: user.name || 'Divine Donor',
      userPhone: user.phone,
      subject,
      message,
      status: 'Open'
    });
    await ticket.save();
    res.status(201).json({ status: true, message: 'Support ticket submitted successfully', data: ticket });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Content
router.get('/content/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (slug === ':slug') {
      return res.status(400).json({ status: false, message: 'Please specify a valid slug parameter (e.g. privacy-policy, terms-conditions, or about-us) in Postman Path Variables.' });
    }

    let page = await Content.findOne({ $or: [{ key: slug }, { slug: slug }] });

    if (!page) {
      let title = '';
      let defaultContent = '';
      let key = '';

      if (slug === 'privacy' || slug === 'privacy-policy') {
        key = 'privacy';
        title = 'Privacy Policy';
        defaultContent = `### 1. Information Collection\nWe collect details you provide directly like phone number, email, and name. Transactions made via your wallet are safely ledgered.\n\n### 2. Sponsoring Protection\nAll donations made on Divine Nakshatra go through verified 12A/80G NGOs to prevent misuse.\n\n### 3. Account Safety\nYou can deactivate or delete your account at any time. Doing so disables your wallet and hides your profile.`;
      } else if (slug === 'terms' || slug === 'terms-conditions' || slug === 'terms-and-conditions') {
        key = 'terms';
        title = 'Terms & Conditions';
        defaultContent = `### 1. Sponsoring Ledger\nBy topup or donating, you agree that transactions are settlements made on verified social campaigns.\n\n### 2. Astrological Courses\nTeachers are independent partners. Review course details, schedules, and curriculum before booking.\n\n### 3. Code of Conduct\nAbuse, falsified campaign setups, and offensive review comments will result in instant account suspension.`;
      } else if (slug === 'about' || slug === 'about-us') {
        key = 'about';
        title = 'About Us';
        defaultContent = `### Sponsoring Astrological and Social Changes\nDivine Nakshatra blends ancient Vedic wisdom with modern social impact. We connect verified astrologers with students, and donors with local NGOs.\n\n### Our Mission\nTo foster an ecosystem of learning, charity, and transparency, powered by dynamic real-time reporting ledgers.`;
      }

      if (key) {
        let existing = await Content.findOne({ key });
        if (existing) {
          existing.slug = slug;
          await existing.save();
          page = existing;
        } else {
          page = new Content({ key, slug, title, content: defaultContent });
          await page.save();
        }
      } else {
        return res.status(404).json({ status: false, message: 'Section content not found' });
      }
    }

    res.json({
      status: true,
      title: page.title,
      content: page.content,
      slug: page.slug,
      key: page.key
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
