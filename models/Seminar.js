const mongoose = require('mongoose');

const seminarSchema = new mongoose.Schema({
  seminarId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  agoraSessionId: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Seminar', seminarSchema);
