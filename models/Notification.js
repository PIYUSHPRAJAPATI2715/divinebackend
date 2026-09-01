const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  dataId: { type: String, default: '' },
  screen: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
