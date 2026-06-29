const express = require('express');
const router = express.Router();
const Campaign = require('../../models/Campaign');
const Notification = require('../../models/Notification');
const User = require('../../models/User');

// Get active campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { search } = req.query;
    let query = { status: 'Live' };
    
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const regex = new RegExp(trimmedSearch, 'i');
      query.$or = [
        { title: regex },
        { category: regex },
        { description: regex }
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

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    const enriched = campaigns.map(c => {
      let days = c.daysLeft || 30;
      if (c.endDate) {
        const diffTime = new Date(c.endDate) - new Date();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else if (c.createdAt) {
        const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      const obj = c.toObject();
      obj.daysLeft = days;
      obj.donorsCount = obj.donorsCount || 0;
      return obj;
    });
    res.json({ status: true, data: enriched });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    // Fetch recent successful transactions for this campaign
    const Transaction = require('../../models/Transaction');
    const recentTransactions = await Transaction.find({
      type: 'Donation',
      item: campaign.title,
      status: 'Success'
    })
    .sort({ date: -1 })
    .limit(10);

    const recentDonors = recentTransactions.map(tx => ({
      name: tx.user,
      amount: tx.amount,
      date: tx.date
    }));

    // Attach to campaign object safely to prevent frontend breaking changes
    const campaignObj = campaign.toObject();
    let days = campaignObj.daysLeft || 30;
    if (campaignObj.endDate) {
      const diffTime = new Date(campaignObj.endDate) - new Date();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (campaignObj.createdAt) {
      const diffTime = (new Date(campaignObj.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    campaignObj.daysLeft = days;
    campaignObj.donorsCount = campaignObj.donorsCount || 0;
    campaignObj.recentDonors = recentDonors;

    res.json({ status: true, data: campaignObj });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Raise campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { title, category, description, goal, imageUrl, oneTimeOrMonthly, endDate, images, video, documents, bankDetails } = req.body;
    if (!title || !goal) {
      return res.status(400).json({ status: false, message: 'Title and Goal amount are required' });
    }
    
    const newCampaign = new Campaign({
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      title,
      user: req.user.name || 'Divine Donor',
      category: category || 'General Support',
      description: description || '',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600',
      goal: `₹${Number(goal).toLocaleString()}`,
      raised: '₹0',
      oneTimeOrMonthly: oneTimeOrMonthly || 'One-Time',
      status: 'Live',
      donorsCount: 0,
      endDate: endDate || null,
      images: images || [],
      video: video || null,
      documents: documents || [],
      bankDetails: bankDetails || null
    });
    
    await newCampaign.save();
    
    const notification = new Notification({
      user: req.user._id,
      title: 'Campaign Raised',
      message: `Your fundraising campaign "${title}" has been successfully launched!`
    });
    await notification.save();
    
    res.status(201).json({ status: true, message: 'Campaign raised successfully', data: newCampaign });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
