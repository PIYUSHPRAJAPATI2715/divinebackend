const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  ngoId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logo: { type: String, default: null },
  rating: { type: Number, default: 4.5 },
  impactStats: { type: String, default: "" },
  registrationNumber: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  about: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
  activityProof: [{ type: String }], // Proof of donations spent (images/videos)
  verifiedCampaignsCount: { type: Number, default: 0 },
  payoutHistory: [
    {
      payoutId: { type: String },
      amount: { type: Number },
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'] },
      requestedDate: { type: Date, default: Date.now }
    }
  ],
  kycDocs: [{ type: String }],
  campaigns: [
    {
      campaignId: { type: String },
      title: { type: String },
      goal: { type: String },
      raised: { type: String },
      status: { type: String }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('NGO', ngoSchema);
