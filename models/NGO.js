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
  years: { type: String, default: '' },
  ourMission: { type: String, default: '' },
  // Individual or Organization type
  ngoType: { type: String, enum: ['Individual', 'Organization'], default: 'Organization' },
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
  activityGallery: [
    {
      title: { type: String, required: true },
      description: { type: String },
      imageUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  campaigns: [
    {
      campaignId: { type: String },
      title: { type: String },
      goal: { type: String },
      raised: { type: String },
      status: { type: String }
    }
  ],
  bankAccountHolder: { type: String, default: "" },
  bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },
  bankIFSC: { type: String, default: "" },

  panNumber: { type: String, default: "" },
  panImage: { type: String, default: null },
  tanNumber: { type: String, default: "" },
  tanImage: { type: String, default: null },
  gstNumber: { type: String, default: "" },
  gstDocument: { type: String, default: null },
  registration12A: { type: String, default: "" },
  certificate12A: { type: String, default: null },
  registration80G: { type: String, default: "" },
  certificate80G: { type: String, default: null },
  darpanNumber: { type: String, default: "" },
  darpanCertificate: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('NGO', ngoSchema);
