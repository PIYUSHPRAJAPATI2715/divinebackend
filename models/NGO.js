const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  ngoId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registrationNumber: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('NGO', ngoSchema);
