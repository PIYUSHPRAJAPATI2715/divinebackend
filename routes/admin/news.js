const router = require('express').Router();
const NewsMedia = require('../../models/NewsMedia');

// Helper to format and normalize news document
const formatNews = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const image = obj.imageUrl || obj.image || obj.mediaUrl || '';
  return {
    ...obj,
    id: obj._id,
    imageUrl: image,
    image: image,
    mediaUrl: image,
    date: obj.publishedDate || obj.createdAt
  };
};

// Get all news
router.get('/', async (req, res) => {
  try {
    const news = await NewsMedia.find().sort({ publishedDate: -1, createdAt: -1 });
    res.json(news.map(formatNews));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a news article
router.post('/', async (req, res) => {
  try {
    const newsId = `NWS-${Date.now().toString().slice(-4)}`;
    const imageUrl = req.body.imageUrl || req.body.image || req.body.mediaUrl || '';
    const newNews = new NewsMedia({
      ...req.body,
      newsId,
      imageUrl
    });
    const savedNews = await newNews.save();
    res.status(201).json(formatNews(savedNews));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update news article
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.image && !req.body.imageUrl) {
      updateData.imageUrl = req.body.image;
    } else if (req.body.mediaUrl && !req.body.imageUrl) {
      updateData.imageUrl = req.body.mediaUrl;
    }
    const updatedNews = await NewsMedia.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedNews) {
      return res.status(404).json({ message: 'News article not found' });
    }
    res.json(formatNews(updatedNews));
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
