const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    default: ""
  },
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
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
