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

      const obj = c.toObject();
      obj.daysLeft = days;
      obj.donorsCount = obj.donorsCount || 0;
      obj.imageUrl = finalImage;
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
    const NGO = require('../../models/NGO');

    const recentTransactions = await Transaction.find({
      type: 'Donation',
      item: campaign.title,
      status: 'Success'
    })
    .sort({ date: -1 })
    .limit(10);

    const recentDonors = await Promise.all(recentTransactions.map(async tx => {
      const donorUser = await User.findOne({
        $or: [
          { name: tx.user },
          { phone: tx.mobile },
          { phone: tx.mobile ? tx.mobile.replace('+91', '').trim() : '' }
        ]
      });
      const photo = donorUser?.profilePhoto || donorUser?.logo || 'https://files.catbox.moe/q4i0t0.jpg';
      return {
        name: tx.user || 'Anonymous Donor',
        amount: tx.amount,
        date: tx.date,
        profilePhoto: photo,
        userImage: photo,
        donorImage: photo,
        image: photo
      };
    }));

    // Attach to campaign object safely to prevent frontend breaking changes
    const campaignObj = campaign.toObject();

    // Look up creator dynamic profile info
    const creatorNGO = await NGO.findOne({ name: campaign.user });
    const creatorUser = await User.findOne({ $or: [{ name: campaign.user }, { organizationName: campaign.user }] });
    const creatorName = creatorNGO?.name || creatorUser?.name || creatorUser?.organizationName || campaign.user || 'Divine Organizer';
    const creatorPhoto = creatorNGO?.logo || creatorUser?.profilePhoto || creatorUser?.logo || 'https://files.catbox.moe/q4i0t0.jpg';

    let days = campaignObj.daysLeft || 30;
    if (campaignObj.endDate) {
      const diffTime = new Date(campaignObj.endDate) - new Date();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (campaignObj.createdAt) {
      const diffTime = (new Date(campaignObj.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    let finalImage = '';
    if (Array.isArray(campaignObj.images)) {
      const uploadedImg = campaignObj.images.find(img => typeof img === 'string' && img.trim() !== '' && !img.includes('unsplash.com'));
      if (uploadedImg) finalImage = uploadedImg;
    }
    if (!finalImage && campaignObj.imageUrl && typeof campaignObj.imageUrl === 'string' && campaignObj.imageUrl.trim() !== '' && !campaignObj.imageUrl.includes('unsplash.com')) {
      finalImage = campaignObj.imageUrl.trim();
    }
    if (!finalImage && Array.isArray(campaignObj.images)) {
      const anyImg = campaignObj.images.find(img => typeof img === 'string' && img.trim() !== '');
      if (anyImg) finalImage = anyImg.trim();
    }
    if (!finalImage) {
      finalImage = (campaignObj.imageUrl && typeof campaignObj.imageUrl === 'string') ? campaignObj.imageUrl.trim() : '';
    }

    campaignObj.user = creatorName;
    campaignObj.creatorName = creatorName;
    campaignObj.userImage = creatorPhoto;
    campaignObj.userLogo = creatorPhoto;
    campaignObj.profilePhoto = creatorPhoto;
    campaignObj.creatorImage = creatorPhoto;
    campaignObj.creatorPhoto = creatorPhoto;
    campaignObj.daysLeft = days;
    campaignObj.donorsCount = campaignObj.donorsCount || 0;
    campaignObj.imageUrl = finalImage;
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
    
    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    const dbUser = await User.findById(req.user.id || req.user._id);
    const creatorName = (dbUser && dbUser.name && dbUser.name.trim() !== '') 
      ? dbUser.name 
      : (dbUser && dbUser.organizationName && dbUser.organizationName.trim() !== '') 
        ? dbUser.organizationName 
        : (req.body.user && req.body.user.trim() !== '' ? req.body.user : (dbUser?.phone || 'Divine User'));

    const newCampaign = new Campaign({
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      title,
      user: creatorName,
      category: category || 'General Support',
      description: description || '',
      imageUrl: finalCoverImage,
      goal: `₹${Number(goal).toLocaleString()}`,
      raised: '₹0',
      oneTimeOrMonthly: oneTimeOrMonthly || 'One-Time',
      status: 'Live',
      donorsCount: 0,
      endDate: endDate || null,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
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
