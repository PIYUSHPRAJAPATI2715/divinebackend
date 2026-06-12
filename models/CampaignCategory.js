const mongoose = require('mongoose');

const campaignCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '' },
  description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('CampaignCategory', campaignCategorySchema);
