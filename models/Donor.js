const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  donorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  totalDonated: { type: String, required: true }, // e.g. "₹45,000"
  campaignsSupported: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  donationHistory: [
    {
      campaignTitle: { type: String },
      amount: { type: String },
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['One-Time', 'Monthly'], default: 'One-Time' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Donor', donorSchema);
