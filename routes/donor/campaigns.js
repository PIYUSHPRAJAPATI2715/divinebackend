const express = require('express');
const router = express.Router();
const Campaign = require('../../models/Campaign');
const Notification = require('../../models/Notification');

// Get active campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ status: 'Live' }).sort({ createdAt: -1 });
    res.json({ status: true, data: campaigns });
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
    res.json({ status: true, data: campaign });
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
