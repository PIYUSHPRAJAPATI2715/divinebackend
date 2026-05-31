const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  campaignId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  user: { type: String, required: true }, // Creator name / NGO name
  category: { type: String, enum: ['Fundraising', 'NGO Donation', 'Gau Seva'], default: 'Fundraising' },
  description: { type: String, default: '' },
  goal: { type: String, required: true }, // e.g. "₹5,00,000"
  raised: { type: String, required: true }, // e.g. "₹2,45,000"
  oneTimeOrMonthly: { type: String, enum: ['One-Time', 'Monthly', 'Both'], default: 'One-Time' },
  status: { type: String, enum: ['Pending', 'Live', 'Completed'], default: 'Pending' },
  verificationDocs: [{ type: String }], // URLs to documents like medical reports or registrations
  withdrawalRequested: { type: Boolean, default: false },
  withdrawalStatus: { type: String, enum: ['None', 'Requested', 'Approved', 'Rejected'], default: 'None' },
  withdrawalRequests: [
    {
      amount: { type: Number },
      requestedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
      releasedAt: { type: Date }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
