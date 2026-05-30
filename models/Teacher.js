const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  expertise: { type: String, required: true }, // e.g. Vedic Astrology, Tarot
  experience: { type: String, required: true }, // e.g. 15 Yrs
  about: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  kycStatus: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  certificates: [{ type: String }], // Array of Certificate URLs
  totalEarnings: { type: Number, default: 0 },
  withdrawableAmount: { type: Number, default: 0 },
  liveBatchesCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
