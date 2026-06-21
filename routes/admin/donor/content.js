const express = require('express');
const router = express.Router();
const Content = require('../../../models/Content');

// Get content configuration
router.get('/content', async (req, res) => {
  try {
    const content = await Content.find();
    res.json({ status: true, data: content });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Update/Upsert legal policy content dynamically
router.post('/content', async (req, res) => {
  try {
    const { key, slug, title, content } = req.body;
    const identifier = key || slug;
    if (!identifier || !title || !content) {
      return res.status(400).json({ status: false, message: 'key or slug, title, and content are required' });
    }

    let page = await Content.findOne({ $or: [{ key: identifier }, { slug: identifier }] });
    if (page) {
      page.title = title;
      page.content = content;
      if (slug) page.slug = slug;
      if (key) page.key = key;
      await page.save();
    } else {
      page = new Content({ key: key || identifier, slug: slug || identifier, title, content });
      await page.save();
    }

    res.json({ status: true, message: 'Policy content updated successfully', data: page });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
