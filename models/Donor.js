const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  donorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  totalDonated: { type: String, required: true },
  campaignsSupported: { type: Number, required: true },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('Donor', donorSchema);
