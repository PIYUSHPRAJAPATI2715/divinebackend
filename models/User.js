const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['donor', 'ngo', 'teacher', 'student'],
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
    default: 100
  },

  // Donor-specific fields (e.g. Donate & Fundraise)
  name: {
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
  followingNgos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followingUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  referralCode: { type: String, default: '' },
  referredBy: { type: String, default: '' },
  searchHistory: [{ type: String }],
  couponsClaimed: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
