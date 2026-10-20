const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['Donation', 'Course', 'Seminar', 'Wallet Top-up', 'Wallet Payment'], default: 'Donation' },
  user: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  mobile: { type: String, default: '' },
  email: { type: String, default: '' },
  donorType: { type: String, enum: ['Individual', 'Corporate', 'NGO'], default: 'Individual' },
  recipient: { type: String, default: '' },
  recipientType: { type: String, enum: ['Campaign', 'NGO', 'Daan Seva'], default: 'Campaign' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null },
  fundCategory: { type: String, default: '' },
  item: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'UPI' },
  paymentPlan: { type: String, enum: ['Full Payment', 'EMI - 50% Advance', 'EMI - Completed', 'None'], default: 'None' },
  status: { type: String, enum: ['Success', 'Pending', 'Failed'], default: 'Success' },
  date: { type: Date, default: Date.now },
  gatewayFee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  gatewayRefId: { type: String, default: '' },
  ipAddress: { type: String, default: '103.21.124.58' },
  device: { type: String, default: 'Android Mobile App' },
  location: { type: String, default: 'New Delhi, India' },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
