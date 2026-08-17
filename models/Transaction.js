const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Donation', 'Course', 'Seminar', 'Wallet Top-up', 'Wallet Payment'], default: 'Donation' },
  user: { type: String, required: true },
  mobile: { type: String, default: '' },
  fundCategory: { type: String, default: '' },
  item: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentPlan: { type: String, enum: ['Full Payment', 'EMI - 50% Advance', 'EMI - Completed', 'None'], default: 'None' },
  status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
