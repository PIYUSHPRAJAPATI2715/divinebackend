const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  campaignId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  user: { type: String, required: true },
  goal: { type: String, required: true }, // Keeping as string for now to match UI "₹5,00,000" or we can parse it
  raised: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Live', 'Completed'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
