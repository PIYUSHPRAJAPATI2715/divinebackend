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
    const { key, title, content } = req.body;
    if (!key || !title || !content) {
      return res.status(400).json({ status: false, message: 'key, title, and content are required' });
    }

    let page = await Content.findOne({ key });
    if (page) {
      page.title = title;
      page.content = content;
      await page.save();
    } else {
      page = new Content({ key, title, content });
      await page.save();
    }

    res.json({ status: true, message: 'Policy content updated successfully', data: page });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
