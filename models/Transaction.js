const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Donation', 'Course', 'Seminar'], required: true },
  user: { type: String, required: true },
  item: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentPlan: { type: String, enum: ['Full Payment', 'EMI - 50% Advance', 'EMI - Completed', 'None'], default: 'None' },
  status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
