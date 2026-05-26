const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referralId: { type: String, required: true, unique: true },
  referrerName: { type: String, required: true },
  referredUserName: { type: String, required: true },
  rewardAmount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);
