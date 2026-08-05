const mongoose = require('mongoose');

const campaignCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '' },       // emoji or text icon
  imageUrl: { type: String, default: '' },   // full image URL for display
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CampaignCategory', campaignCategorySchema);
