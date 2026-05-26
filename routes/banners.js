const router = require('express').Router();
const Banner = require('../models/Banner');

// Get all banners
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a banner
router.post('/', async (req, res) => {
  try {
    const bannerId = `BNR-${Date.now().toString().slice(-4)}`;
    const newBanner = new Banner({ ...req.body, bannerId });
    const savedBanner = await newBanner.save();
    res.status(201).json(savedBanner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update banner
router.put('/:id', async (req, res) => {
  try {
    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedBanner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete banner
router.delete('/:id', async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
