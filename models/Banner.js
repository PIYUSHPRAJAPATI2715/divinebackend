const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  bannerId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: '' },
  placement: { type: String, enum: ['Home', 'Campaigns', 'Courses'], default: 'Home' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
