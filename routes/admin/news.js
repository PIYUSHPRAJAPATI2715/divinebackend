const router = require('express').Router();
const NewsMedia = require('../../models/NewsMedia');

// Get all news
router.get('/', async (req, res) => {
  try {
    const news = await NewsMedia.find().sort({ publishedDate: -1 });
    res.json(news);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a news article
router.post('/', async (req, res) => {
  try {
    const newsId = `NWS-${Date.now().toString().slice(-4)}`;
    const newNews = new NewsMedia({ ...req.body, newsId });
    const savedNews = await newNews.save();
    res.status(201).json(savedNews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update news article
router.put('/:id', async (req, res) => {
  try {
    const updatedNews = await NewsMedia.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedNews);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete news article
router.delete('/:id', async (req, res) => {
  try {
    await NewsMedia.findByIdAndDelete(req.params.id);
    res.json({ message: 'News article deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
