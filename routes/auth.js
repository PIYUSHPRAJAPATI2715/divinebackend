const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

/**
 * @route   POST /api/auth/check-role
 * @desc    Get the registered role of a phone number
 * @access  Public
 */
router.post('/check-role', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ status: false, message: 'Phone number is required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.json({
        status: true,
        isUserExist: false,
        role: null
      });
    }

    res.json({
      status: true,
      isUserExist: user.isProfileComplete,
      role: user.role
    });

  } catch (err) {
    console.error('Check role error:', err);
    res.status(400).json({ status: false, message: err.message || 'Check role failed' });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    Initiate signup by phone & role, check if exists, send OTP
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ status: false, message: 'Phone number is required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ phone });
    
    if (existingUser) {
      existingUser.otp = '1234';
      existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      await existingUser.save();

      console.log(`[AUTH] OTP sent to ${phone}: 1234`);

      return res.json({
        status: true,
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isUserExist: existingUser.isProfileComplete,
        phone,
        role: existingUser.role,
        otp: '1234'
      });
    }

    // New user signup
    const newUser = new User({
      phone,
      role: 'donor',
      isProfileComplete: false,
      otp: '1234',
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
    });

    await newUser.save();

    console.log(`[AUTH] OTP sent to ${phone}: 1234`);

    res.json({
      status: true,
      message: 'OTP sent successfully (Use static code 1234 to verify)',
      isUserExist: false,
      phone,
      role: 'donor',
      otp: '1234'
    });

  } catch (err) {
    console.error('Signup initiation error:', err);
    res.status(400).json({ status: false, message: err.message || 'Signup initiation failed' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin by email/pass OR initiate user login by phone checking if exists
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;

    // 1. If phone is provided, run user phone-OTP flow
    if (phone) {
      const existingUser = await User.findOne({ phone });

      if (existingUser) {
        existingUser.otp = '1234';
        existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await existingUser.save();

        console.log(`[AUTH] OTP sent to ${phone}: 1234`);

        return res.json({
          status: true,
          message: 'OTP sent successfully (Use static code 1234 to verify)',
          isUserExist: existingUser.isProfileComplete,
          phone,
          role: existingUser.role,
          otp: '1234'
        });
      }

      // If logging in but doesn't exist, treat it as a signup start
      const newUser = new User({
        phone,
        role: 'donor',
        isProfileComplete: false,
        otp: '1234',
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
      });
      await newUser.save();

      console.log(`[AUTH] OTP sent to ${phone}: 1234`);

      return res.json({
        status: true,
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isUserExist: false,
        phone,
        role: 'donor',
        otp: '1234'
      });
    }

    // 2. If email/password is provided, fallback to admin login (for dashboard compatibility)
    if (email && password) {
      const admin = await Admin.findOne({ email });
      if (admin) {
        const isPlainMatch = admin.password === password;
        let isHashMatch = false;

        if (!isPlainMatch && admin.password.startsWith('$2')) {
          isHashMatch = await bcrypt.compare(password, admin.password);
        }

        if (isPlainMatch || isHashMatch) {
          const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
          return res.json({
            status: true,
            message: 'Login successful',
            token,
            data: {
              id: admin._id,
              email: admin.email,
              role: 'admin'
            }
          });
        }
      }
      return res.status(401).json({ status: false, message: 'Invalid admin credentials' });
    }

    return res.status(400).json({ status: false, message: 'Please provide either a phone number or admin credentials' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ status: false, message: err.message || 'Login failed' });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP to a phone number
 * @access  Public
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ status: false, message: 'Phone number is required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User session not found. Please initiate signup/login first.'
      });
    }

    user.otp = '1234';
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    console.log(`[AUTH] OTP resent to ${phone}: 1234`);

    res.json({
      status: true,
      message: 'OTP resent successfully (Use static code 1234 to verify)',
      phone: user.phone,
      role: user.role,
      otp: '1234'
    });

  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(400).json({ status: false, message: err.message || 'Resend OTP failed' });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and log in / start signup
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ status: false, message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User session not found. Please request a new OTP.' });
    }

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ status: false, message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ status: false, message: 'OTP has expired. Please request a new OTP.' });
    }

    // Clear OTP details upon verification
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, role: user.role, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      status: true,
      message: 'OTP verified successfully',
      token,
      isProfileComplete: user.isProfileComplete,
      data: user
    });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(400).json({ status: false, message: err.message || 'OTP verification failed' });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register / finalize profile setup with conditional fields depending on user role
 * @access  Private
 */
const registerHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: false, message: 'Unauthorized access. Valid token is required.' });
    }
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Extract email, optional role and phone from registration body
    const { email, role, phone } = req.body;

    if (role) {
      if (['donor', 'ngo', 'teacher'].includes(role)) {
        user.role = role;
      } else {
        return res.status(400).json({ status: false, message: 'Invalid role. Must be either "donor", "ngo", or "teacher".' });
      }
    }

    if (email) {
      const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
      if (emailInUse) {
        return res.status(400).json({ status: false, message: 'Email address is already in use by another account' });
      }
      user.email = email;
    }

    if (phone) {
      const phoneInUse = await User.findOne({ phone, _id: { $ne: userId } });
      if (phoneInUse) {
        return res.status(400).json({ status: false, message: 'Phone number is already in use by another account' });
      }
      user.phone = phone;
    }

    // Role-based fields validation and assignment
    if (user.role === 'ngo') {
      const {
        organizationName,
        registeredAddress,
        addressCertificate,
        authorizedPerson,
        designation,
        gender,
        profilePhoto,
        
        // Documents
        panNumber,
        panImage,
        tanNumber,
        tanImage,
        gstNumber,
        gstDocument,
        registration12A,
        certificate12A,
        registration80G,
        certificate80G,
        
        // Extra Docs
        hasDarpan,
        darpanNumber,
        darpanCertificate,
        hasCSR1,
        csr1Number,
        csr1Certificate,
        hasFCRA,
        fcraNumber,
        fcraCertificate,
        hasOtherRegistration,
        otherRegistrationName,
        otherRegistrationCertificate,
        
        // Bank details
        bankAccountHolder,
        bankName,
        bankBranch,
        bankAccountNumber,
        bankIFSC
      } = req.body;

      if (!organizationName || !registeredAddress || !authorizedPerson || !designation) {
        return res.status(400).json({
          status: false,
          message: 'Organization Name, Registered Address, Authorized Person name, and Designation are required for NGO registration.'
        });
      }

      user.organizationName = organizationName;
      user.registeredAddress = registeredAddress;
      user.addressCertificate = addressCertificate || null;
      user.authorizedPerson = authorizedPerson;
      user.designation = designation;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;

      // Docs
      user.panNumber = panNumber || "";
      user.panImage = panImage || null;
      user.tanNumber = tanNumber || "";
      user.tanImage = tanImage || null;
      user.gstNumber = gstNumber || "";
      user.gstDocument = gstDocument || null;
      user.registration12A = registration12A || "";
      user.certificate12A = certificate12A || null;
      user.registration80G = registration80G || "";
      user.certificate80G = certificate80G || null;

      // Extra verification
      user.hasDarpan = !!hasDarpan;
      user.darpanNumber = darpanNumber || "";
      user.darpanCertificate = darpanCertificate || null;
      user.hasCSR1 = !!hasCSR1;
      user.csr1Number = csr1Number || "";
      user.csr1Certificate = csr1Certificate || null;
      user.hasFCRA = !!hasFCRA;
      user.fcraNumber = fcraNumber || "";
      user.fcraCertificate = fcraCertificate || null;
      user.hasOtherRegistration = !!hasOtherRegistration;
      user.otherRegistrationName = otherRegistrationName || "";
      user.otherRegistrationCertificate = otherRegistrationCertificate || null;

      // Bank
      user.bankAccountHolder = bankAccountHolder || "";
      user.bankName = bankName || "";
      user.bankBranch = bankBranch || "";
      user.bankAccountNumber = bankAccountNumber || "";
      user.bankIFSC = bankIFSC || "";

    } else if (user.role === 'teacher') {
      // Role is 'teacher' (Astro Coach)
      const { name, expertise, experience, about, gender, profilePhoto } = req.body;

      if (!name || !expertise || !experience) {
        return res.status(400).json({ 
          status: false, 
          message: 'Name, Expertise, and Experience are required for Teacher registration.' 
        });
      }

      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
      
    } else {
      // Role is 'donor' (Donate & Fundraise)
      const { name, gender, profilePhoto } = req.body;

      if (!name) {
        return res.status(400).json({ status: false, message: 'Name is required for Donor registration.' });
      }

      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
    }

    user.isProfileComplete = true;
    await user.save();

    res.json({
      status: true,
      message: 'Registration completed successfully',
      data: user
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        status: false,
        message: `This ${field} is already registered with another account.`
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({
        status: false,
        message: messages
      });
    }
    res.status(400).json({ status: false, message: err.message || 'Registration failed' });
  }
};


// Import other models for wallet/donation operations
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged-in user profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    res.json({ status: true, data: user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/auth/wallet/topup
 * @desc    Add money to donor wallet
 * @access  Private
 */
router.post('/wallet/topup', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid top-up amount' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save();

    // Log the transaction
    const transactionId = `TXN-${Date.now().toString().slice(-4)}`;
    const newTx = new Transaction({
      transactionId,
      type: 'Donation',
      user: user.name || user.phone,
      amount: Number(amount),
      status: 'Success',
      date: new Date(),
      item: 'Wallet Top-up'
    });
    await newTx.save();

    res.json({ status: true, message: 'Wallet topped up successfully', data: user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/auth/wallet/donate
 * @desc    Donate to a campaign using wallet balance
 * @access  Private
 */
router.post('/wallet/donate', authMiddleware, async (req, res) => {
  try {
    const { campaignId, amount } = req.body;
    if (!campaignId || !amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: false, message: 'Campaign ID and positive amount are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    if ((user.walletBalance || 0) < Number(amount)) {
      return res.status(400).json({ status: false, message: 'Insufficient wallet balance. Please top up.' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Fundraising campaign not found' });
    }

    // Deduct from user wallet
    user.walletBalance -= Number(amount);
    await user.save();

    // Add to campaign raised amount
    const currentRaised = Number(campaign.raised.replace(/[^0-9]/g, '')) || 0;
    const newRaised = currentRaised + Number(amount);
    campaign.raised = `₹${newRaised.toLocaleString()}`;
    await campaign.save();

    // Log the transaction
    const transactionId = `TXN-${Date.now().toString().slice(-4)}`;
    const newTx = new Transaction({
      transactionId,
      type: 'Donation',
      user: user.name || user.phone,
      amount: Number(amount),
      status: 'Success',
      date: new Date(),
      item: campaign.title
    });
    await newTx.save();

    res.json({ 
      status: true, 
      message: `Successfully donated ₹${amount} to "${campaign.title}"`,
      data: user,
      campaign
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/register', authMiddleware, registerHandler);
router.post('/profile-setup', authMiddleware, registerHandler); // maintain profile-setup alias for compatibility

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({ status: true, message: 'Logged out successfully' });
});

module.exports = router;

