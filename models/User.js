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
  // Social, referral, and rewards fields
  followingNgos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'NGO' }],
  followingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  referralCode: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  searchHistory: [{ type: String }],
  couponsClaimed: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
