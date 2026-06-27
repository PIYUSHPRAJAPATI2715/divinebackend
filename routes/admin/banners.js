const router = require('express').Router();
const Banner = require('../../models/Banner');

// Helper: compute effective status based on date timeline
const getBannerTimeline = (banner) => {
  const now = new Date();
  if (banner.startDate && banner.endDate) {
    if (now < new Date(banner.startDate)) return 'Scheduled';
    if (now > new Date(banner.endDate)) return 'Expired';
    return 'Live';
  }
  if (banner.startDate && now < new Date(banner.startDate)) return 'Scheduled';
  if (banner.endDate && now > new Date(banner.endDate)) return 'Expired';
  return 'Live';
};

// Get all banners (sorted by displayOrder)
router.get('/', async (req, res) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    const enriched = banners.map(b => ({
      ...b.toObject(),
      timelineStatus: getBannerTimeline(b)
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a banner
router.post('/', async (req, res) => {
  try {
    const bannerId = `BNR-${Date.now().toString().slice(-6)}`;
    const newBanner = new Banner({ ...req.body, bannerId });
    const savedBanner = await newBanner.save();
    res.status(201).json({
      ...savedBanner.toObject(),
      timelineStatus: getBannerTimeline(savedBanner)
    });
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
    res.json({
      ...updatedBanner.toObject(),
      timelineStatus: getBannerTimeline(updatedBanner)
    });
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
