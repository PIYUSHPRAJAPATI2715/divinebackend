const router = require('express').Router();
const Campaign = require('../models/Campaign');

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new campaign
router.post('/', async (req, res) => {
  try {
    const newCampaign = new Campaign({ ...req.body, campaignId: `CMP-${Date.now().toString().slice(-4)}` });
    const savedCampaign = await newCampaign.save();
    res.status(201).json(savedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a campaign
router.put('/:id', async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true }
    );
    res.json(updatedCampaign);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a campaign
router.delete('/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
