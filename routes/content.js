const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const SupportSetting = require('../models/SupportSetting');
const SupportTicket = require('../models/SupportTicket');

// Get all active public pages
router.get('/', async (req, res) => {
  try {
    const pages = await Content.find({ isActive: true }).select('key slug title category metaDescription updatedAt');
    res.json({ status: true, data: pages, pages });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Get single page by slug or key (e.g. privacy-policy, terms-and-conditions, about-us, refund-policy)
router.get('/:slugOrKey', async (req, res) => {
  try {
    const param = req.params.slugOrKey.toLowerCase();
    const key = param.replace(/-/g, '_');
    const slug = param.replace(/_/g, '-');

    const page = await Content.findOne({
      $or: [{ key }, { slug }, { _id: param.length === 24 ? param : null }],
      isActive: true
    });

    if (!page) {
      return res.status(404).json({ status: false, message: 'Page not found' });
    }

    res.json({
      status: true,
      data: {
        key: page.key,
        slug: page.slug,
        title: page.title,
        content: page.content,
        metaDescription: page.metaDescription,
        updatedAt: page.updatedAt
      },
      page: page.content,
      title: page.title
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
