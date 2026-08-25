const mongoose = require('mongoose');

const ngoSchema = new mongoose.Schema({
  ngoId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  legalName: { type: String, default: "" },
  logo: { type: String, default: null },
  rating: { type: Number, default: 0.0 },
  impactStats: { type: String, default: "" },
  registrationNumber: { type: String, required: true },
  contactPerson: { type: String, required: true },
  registeredAddress: { type: String, default: "" },
  addressCertificate: { type: String, default: null },
  designation: { type: String, default: "" },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  about: { type: String, default: '' },
  briefProfile: { type: String, default: '' },
  years: { type: String, default: '' },
  ourMission: { type: String, default: '' },
  
  // Organization classification
  organizationType: { type: String, enum: ['Non-Profit', 'Corporate'], default: 'Non-Profit' },
  isRegisteredNonProfit: { type: String, default: '' },
  isRegisteredCompany: { type: String, default: '' },

  ngoType: { type: String, enum: ['Individual', 'Organization'], default: 'Organization' },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },

  // Document Uploads
  moaAoaDocs: [{ type: String }],
  panNumber: { type: String, default: "" },
  panImage: { type: String, default: null },
  tanNumber: { type: String, default: "" },
  tanImage: { type: String, default: null },
  gstNumber: { type: String, default: "" },
  gstDocument: { type: String, default: null },

  // Certifications
  has12A: { type: String, default: 'No' },
  registration12A: { type: String, default: "" },
  certificate12A: { type: String, default: null },
  has80G: { type: String, default: 'No' },
  registration80G: { type: String, default: "" },
  certificate80G: { type: String, default: null },
  hasDarpan: { type: String, default: 'No' },
  darpanNumber: { type: String, default: "" },
  darpanCertificate: { type: String, default: null },
  hasCSR1: { type: String, default: 'No' },
  csr1Number: { type: String, default: '' },
  csr1Certificate: { type: String, default: null },
  hasFCRA: { type: String, default: 'No' },
  fcraNumber: { type: String, default: '' },
  fcraCertificate: { type: String, default: null },

  websiteUrl: { type: String, default: '' },

  // Bank details
  bankAccountHolder: { type: String, default: "" },
  bankName: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
  bankAccountNumber: { type: String, default: "" },
  bankIFSC: { type: String, default: "" },
  cancelledChequeDoc: { type: String, default: null },

  // Directors / Trustees / Key Management / Partners
  directorsKeyManagement: [
    {
      name: { type: String },
      designation: { type: String },
      email: { type: String },
      pan: { type: String },
      aadharId: { type: String },
      linkedInUrl: { type: String }
    }
  ],

  // Form Filler details
  formFillerDetails: {
    name: { type: String, default: '' },
    designationRole: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    pan: { type: String, default: '' },
    aadharId: { type: String, default: '' },
    authorityLetterDoc: { type: String, default: null }
  },

  // Non-Profit specific fields
  lastFinancialYearBudget: { type: String, default: '' },
  donorDatabaseStrength: { type: String, default: '' },
  employeeStrength: { type: String, default: '' },
  hasCrowdfundedBefore: { type: String, default: 'No' },
  crowdfundingPlatformsUsed: { type: String, default: '' },
  campaignPlanningTimeframe: { type: String, default: '' },
  purposeOfFundraising: { type: String, default: '' },

  // Corporate specific fields
  csrObligation: { type: String, default: '' },
  csrAmountSpentPreviousYear: { type: String, default: '' },
  csrFocusAreas: [{ type: String }],
  fundingPreferences: { type: String, default: '' },
  csrOfficerDetails: {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    linkedInUrl: { type: String, default: '' }
  },

  // Awards & Recognitions
  awardsRecognitions: [
    {
      name: { type: String },
      awardedBy: { type: String },
      year: { type: String },
      description: { type: String },
      document: { type: String }
    }
  ],

  // Declarations & Terms
  declarations: {
    infoTrueAccurate: { type: Boolean, default: false },
    declaredPurposesOnly: { type: Boolean, default: false },
    maintainRecords: { type: Boolean, default: false },
    privacyPolicyAgreed: { type: Boolean, default: false },
    kycAgreed: { type: Boolean, default: false },
    suspensionUnderstood: { type: Boolean, default: false }
  },

  activityProof: [{ type: String }],
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
  ]
}, { timestamps: true });

module.exports = mongoose.model('NGO', ngoSchema);
