const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  bannerId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  imageUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  targetRoute: { type: String, default: '' },
  location: {
    type: String,
    enum: [
      'home_top',
      'home_bottom',
      'donate_home_top',
      'daan_category_top',
      'daan_category_bottom',
      'campaign_list_top',
      'following_list_top',
      'campaign_details_bottom',
      'Home', 'Campaigns', 'Courses', 'DaanTop', 'DaanBottom', 'Membership'
    ],
    default: 'home_top'
  },
  placement: { type: String, default: 'home_top' },
  page: { type: String, default: 'Home Page' },
  position: { type: String, default: 'Top' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isSubscriptionActive: { type: Boolean, default: true },
  subscriptionPlan: { type: String, default: 'Standard' },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  displayOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
