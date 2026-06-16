const express = require('express');
const router = express.Router();
const NGO = require('../models/NGO');
const Campaign = require('../models/Campaign');
const CampaignCategory = require('../models/CampaignCategory');
const User = require('../models/User');

// Helper to get or create NGO profile connected to logged-in User
const getOrCreateNGOProfile = async (req) => {
  // Try to find by phone or email
  let ngo = await NGO.findOne({
    $or: [
      { phone: req.user.phone },
      { email: req.user.email }
    ]
  });

  if (!ngo) {
    // Dynamically create an NGO record if it doesn't exist
    const name = req.user.organizationName || req.user.name || 'My NGO';
    const email = req.user.email || 'ngo@example.com';
    const phone = req.user.phone || '';
    
    ngo = new NGO({
      ngoId: `NGO-${Date.now().toString().slice(-4)}`,
      name,
      email,
      phone,
      registrationNumber: 'REG-PENDING',
      contactPerson: req.user.authorizedPerson || name,
      about: req.user.about || '',
      status: 'Verified' // Auto-verify dynamic partner signups for immediate portal usability
    });
    await ngo.save();
  }
  return ngo;
};

// 1. Get NGO Profile
router.get('/profile', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    res.json(ngo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Get NGO Campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    // Find campaigns where user matches the NGO name
    const campaigns = await Campaign.find({ user: ngo.name }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Create NGO Campaign
router.post('/campaigns', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    
    // Automatically enforce campaignId and user context (linked to NGO name)
    const campaignData = {
      ...req.body,
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      user: ngo.name,
      status: 'Live' // Default to Live so it renders on home feed immediately
    };
    
    const newCampaign = new Campaign(campaignData);
    const saved = await newCampaign.save();
    
    // Increment campaigns count in NGO record
    ngo.verifiedCampaignsCount = (ngo.verifiedCampaignsCount || 0) + 1;
    ngo.campaigns.push({
      campaignId: saved.campaignId,
      title: saved.title,
      goal: saved.goal,
      raised: saved.raised,
      status: saved.status
    });
    await ngo.save();
    
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. Update NGO Campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    // Ensure the campaign belongs to this NGO before updating
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.user !== ngo.name) {
      return res.status(403).json({ message: 'Access denied: You do not own this campaign' });
    }
    
    const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Sync update to NGO campaigns array
    const ngoCampaignIdx = ngo.campaigns.findIndex(c => c.campaignId === updated.campaignId);
    if (ngoCampaignIdx !== -1) {
      ngo.campaigns[ngoCampaignIdx].title = updated.title;
      ngo.campaigns[ngoCampaignIdx].goal = updated.goal;
      ngo.campaigns[ngoCampaignIdx].status = updated.status;
      await ngo.save();
    }
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Submit Payout Request
router.post('/payouts', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount' });
    }
    
    const newPayout = {
      payoutId: `PO-${Date.now().toString().slice(-4)}`,
      amount: Number(amount),
      status: 'Pending',
      requestedDate: new Date()
    };
    
    ngo.payoutHistory.push(newPayout);
    await ngo.save();
    
    res.status(201).json({ status: true, payout: newPayout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5b. Update NGO Profile (including linked User details/bank accounts)
router.put('/profile', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { 
      name, 
      registrationNumber, 
      contactPerson, 
      about,
      email,
      gender,
      bankAccountHolder,
      bankName,
      bankBranch,
      bankAccountNumber,
      bankIFSC
    } = req.body;

    if (name) ngo.name = name;
    if (registrationNumber) ngo.registrationNumber = registrationNumber;
    if (contactPerson) ngo.contactPerson = contactPerson;
    if (about !== undefined) ngo.about = about;
    if (email) ngo.email = email;
    await ngo.save();

    // Sync user details
    const user = await User.findById(req.user.id);
    if (user) {
      if (gender) user.gender = gender;
      if (bankAccountHolder) user.bankAccountHolder = bankAccountHolder;
      if (bankName) user.bankName = bankName;
      if (bankBranch) user.bankBranch = bankBranch;
      if (bankAccountNumber) user.bankAccountNumber = bankAccountNumber;
      if (bankIFSC) user.bankIFSC = bankIFSC;
      await user.save();
    }

    res.json({ status: true, ngo, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5c. Add NGO Relief Activity Proof (Gallery upload)
router.post('/gallery', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { title, description, imageUrl } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ message: 'Title and image URL are required' });
    }

    const newProof = {
      title,
      description: description || '',
      imageUrl,
      uploadedAt: new Date()
    };

    ngo.activityGallery.push(newProof);
    await ngo.save();

    res.status(201).json(ngo.activityGallery[ngo.activityGallery.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
