const router = require('express').Router();
const Campaign = require('../../models/Campaign');

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single campaign detailed page
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Fundraising campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new campaign
router.post('/', async (req, res) => {
  try {
    const { title, goal, imageUrl, images } = req.body;
    if (!title || !goal) {
      return res.status(400).json({ status: false, message: 'Title and Goal amount are required' });
    }

    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    const newCampaign = new Campaign({
      ...req.body,
      imageUrl: finalCoverImage,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      campaignId: `CMP-${Date.now().toString().slice(-4)}`
    });
    const savedCampaign = await newCampaign.save();
    res.status(201).json({ status: true, message: 'Campaign created successfully', data: savedCampaign, ...savedCampaign.toObject() });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
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
