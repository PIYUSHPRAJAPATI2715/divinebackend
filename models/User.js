const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  googleId: { type: String, default: null },
  googleEmail: { type: String, default: null },
  appleId: { type: String, default: null },
  appleEmail: { type: String, default: null },
  fcmToken: { type: String, default: null },
  deviceToken: { type: String, default: null },
  platform: { type: String, default: 'android' },
  pushNotification: { type: Boolean, default: true },
  emailNotification: { type: Boolean, default: true },
  smsNotification: { type: Boolean, default: true },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'corporate', 'teacher', 'student'],
    required: true,
    default: 'donor'
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Verified', 'Approved', 'Rejected', 'Suspended', 'Deleted'],
    default: 'Active'
  },
  verificationStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  organizationName: {
    type: String,
    default: ""
  },
  registeredAddress: {
    type: String,
    default: ""
  },
  authorizedPerson: {
    type: String,
    default: ""
  },
  designation: {
    type: String,
    default: ""
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  // Fields for both roles
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', null],
    default: null
  },
  profilePhoto: {
    type: String,
    default: null
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  cashbackBalance: {
    type: Number,
    default: 0
  },
  cashbackLedger: [
    {
      amount: { type: Number, default: 0 },
      remainingAmount: { type: Number, default: 0 },
      creditedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      source: { type: String, default: 'Recharge Cashback' },
      isExpired: { type: Boolean, default: false }
    }
  ],
  totalCoins: {
    type: Number,
    default: 0
  },
  coinsLedger: [
    {
      coins: { type: Number, default: 0 },
      type: { type: String, enum: ['Earned', 'Redeemed', 'Admin Adjustment'], default: 'Earned' },
      description: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  // Donor-specific fields (e.g. Donate & Fundraise)
  name: {
    type: String,
    default: ""
  },
  impactStats: {
    type: String,
    default: ""
  },
  years: {
    type: String,
    default: ""
  },



  // OTP details
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  countryCode: { type: String, default: '+91' },
  awards: [
    {
      name: { type: String, default: '' },
      title: { type: String, default: '' },
      awardedBy: { type: String, default: '' },
      issuingOrg: { type: String, default: '' },
      year: { type: String, default: '' },
      description: { type: String, default: '' },
      document: { type: String, default: null },
      certificateDoc: { type: String, default: null }
    }
  ],
  awardsRecognitions: [
    {
      name: { type: String, default: '' },
      title: { type: String, default: '' },
      awardedBy: { type: String, default: '' },
      issuingOrg: { type: String, default: '' },
      year: { type: String, default: '' },
      description: { type: String, default: '' },
      document: { type: String, default: null },
      certificateDoc: { type: String, default: null }
    }
  ],
  // Statutory Documents & Fields for NGO & Corporate profiles
  legalName: { type: String, default: '' },
  panNumber: { type: String, default: '' },
  panImage: { type: String, default: null },
  tanNumber: { type: String, default: '' },
  tanImage: { type: String, default: null },
  gstNumber: { type: String, default: '' },
  gstDocument: { type: String, default: null },
  has12A: { type: String, default: 'No' },
  registration12A: { type: String, default: '' },
  certificate12A: { type: String, default: null },
  has80G: { type: String, default: 'No' },
  registration80G: { type: String, default: '' },
  certificate80G: { type: String, default: null },
  hasDarpan: { type: String, default: 'No' },
  darpanNumber: { type: String, default: '' },
  darpanCertificate: { type: String, default: null },
  hasCSR1: { type: String, default: 'No' },
  csr1Number: { type: String, default: '' },
  csr1Certificate: { type: String, default: null },
  hasFCRA: { type: String, default: 'No' },
  fcraNumber: { type: String, default: '' },
  fcraCertificate: { type: String, default: null },
  addressCertificate: { type: String, default: null },
  cancelledChequeDoc: { type: String, default: null },
  moaAoaDocs: [{ type: String }],
  websiteUrl: { type: String, default: '' },
  bankAccountHolder: { type: String, default: '' },
  bankName: { type: String, default: '' },
  bankBranch: { type: String, default: '' },
  bankAccountNumber: { type: String, default: '' },
  bankIFSC: { type: String, default: '' },
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
  formFillerDetails: {
    name: { type: String, default: '' },
    designationRole: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    pan: { type: String, default: '' },
    aadharId: { type: String, default: '' },
    authorityLetterDoc: { type: String, default: null }
  },
  csrOfficerDetails: {
    name: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    linkedInUrl: { type: String, default: '' }
  },
  csrObligation: { type: String, default: '' },
  csrAmountSpentPreviousYear: { type: String, default: '' },
  csrFocusAreas: [{ type: String }],
  fundingPreferences: { type: String, default: '' },
  lastFinancialYearBudget: { type: String, default: '' },
  donorDatabaseStrength: { type: String, default: '' },
  employeeStrength: { type: String, default: '' },
  hasCrowdfundedBefore: { type: String, default: 'No' },
  crowdfundingPlatformsUsed: { type: String, default: '' },
  campaignPlanningTimeframe: { type: String, default: '' },
  purposeOfFundraising: { type: String, default: '' },
  declarations: {
    infoTrueAccurate: { type: Boolean, default: false },
    declaredPurposesOnly: { type: Boolean, default: false },
    maintainRecords: { type: Boolean, default: false },
    privacyPolicyAgreed: { type: Boolean, default: false },
    kycAgreed: { type: Boolean, default: false },
    suspensionUnderstood: { type: Boolean, default: false }
  },
  // Social, referral, and rewards fields
  followingNgos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NGO' }],
  followingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  referralCode: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  searchHistory: [{ type: String }],
  couponsClaimed: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
