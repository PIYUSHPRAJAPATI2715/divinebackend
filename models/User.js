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
    enum: ['donor', 'ngo'],
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

  // NGO/Organization specific fields
  organizationName: {
    type: String,
    default: ""
  },
  logo: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    default: 4.5
  },
  impactStats: {
    type: String,
    default: ""
  },
  registeredAddress: {
    type: String,
    default: ""
  },
  addressCertificate: {
    type: String,
    default: null
  },
  authorizedPerson: {
    type: String,
    default: ""
  },
  designation: {
    type: String,
    default: ""
  },

  // NGO Document Verification
  panNumber: {
    type: String,
    default: ""
  },
  panImage: {
    type: String,
    default: null
  },
  tanNumber: {
    type: String,
    default: ""
  },
  tanImage: {
    type: String,
    default: null
  },
  gstNumber: {
    type: String,
    default: ""
  },
  gstDocument: {
    type: String,
    default: null
  },
  registration12A: {
    type: String,
    default: ""
  },
  certificate12A: {
    type: String,
    default: null
  },
  registration80G: {
    type: String,
    default: ""
  },
  certificate80G: {
    type: String,
    default: null
  },

  // NGO Extra Document Verification (Darpan, CSR, FCRA)
  hasDarpan: {
    type: Boolean,
    default: false
  },
  darpanNumber: {
    type: String,
    default: ""
  },
  darpanCertificate: {
    type: String,
    default: null
  },
  hasCSR1: {
    type: Boolean,
    default: false
  },
  csr1Number: {
    type: String,
    default: ""
  },
  csr1Certificate: {
    type: String,
    default: null
  },
  hasFCRA: {
    type: Boolean,
    default: false
  },
  fcraNumber: {
    type: String,
    default: ""
  },
  fcraCertificate: {
    type: String,
    default: null
  },
  hasOtherRegistration: {
    type: Boolean,
    default: false
  },
  otherRegistrationName: {
    type: String,
    default: ""
  },
  otherRegistrationCertificate: {
    type: String,
    default: null
  },

  // NGO Bank Details
  bankAccountHolder: {
    type: String,
    default: ""
  },
  bankName: {
    type: String,
    default: ""
  },
  bankBranch: {
    type: String,
    default: ""
  },
  bankAccountNumber: {
    type: String,
    default: ""
  },
  bankIFSC: {
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
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
