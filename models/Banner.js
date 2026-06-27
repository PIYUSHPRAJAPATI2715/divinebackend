const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  bannerId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: '' },
  placement: {
    type: String,
    enum: ['Home', 'Campaigns', 'Courses', 'DaanTop', 'DaanBottom', 'Membership'],
    default: 'Home'
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  // Timeline fields
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
