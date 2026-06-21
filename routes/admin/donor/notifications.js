const express = require('express');
const router = express.Router();
const Notification = require('../../../models/Notification');
const User = require('../../../models/User');

// Get all notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('user', 'name phone email')
      .sort({ createdAt: -1 });
    res.json({ status: true, data: notifications });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Broadcast/Push notification to user
router.post('/notifications', async (req, res) => {
  try {
    const { userId, title, message, imageUrl } = req.body;
    if (!title || !message) {
      return res.status(400).json({ status: false, message: 'Title and message are required' });
    }

    if (userId) {
      // Send to single user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ status: false, message: 'Target user not found' });
      }
      const newNotification = new Notification({ user: userId, title, message, imageUrl: imageUrl || null });
      await newNotification.save();
    } else {
      // Broadcast to all donors
      const donors = await User.find({ role: 'donor' });
      const bulkNotifications = donors.map(d => ({
        user: d._id,
        title,
        message,
        imageUrl: imageUrl || null
      }));
      await Notification.insertMany(bulkNotifications);
    }

    res.json({ status: true, message: 'Notification(s) sent successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
