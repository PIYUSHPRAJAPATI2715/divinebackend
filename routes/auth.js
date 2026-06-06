const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

// Helper to generate static OTP for development
function generate4DigitOTP() {
  return '1234';
}

/**
 * @route   POST /api/auth/signup
 * @desc    Initiate signup by phone, check if exists, send OTP
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if user exists and profile is complete
    const existingUser = await User.findOne({ phone });
    const isUserExist = !!(existingUser && existingUser.isProfileComplete);

    const otp = '1234';
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user = existingUser;
    if (!user) {
      user = new User({
        phone,
        isProfileComplete: false
      });
    }

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log(`[AUTH] OTP sent to ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully (Use static code 1234 to verify)',
      isUserExist,
      phone,
      otp: otp
    });

  } catch (err) {
    console.error('Phone signup initiation error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
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
      // Check if user exists and profile is complete
      const existingUser = await User.findOne({ phone });
      const isUserExist = !!(existingUser && existingUser.isProfileComplete);

      const otp = '1234';
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      let user = existingUser;
      if (!user) {
        user = new User({
          phone,
          isProfileComplete: false
        });
      }

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      console.log(`[AUTH] OTP sent to ${phone}: ${otp}`);

      return res.json({
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isUserExist,
        phone,
        otp: otp
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
            message: 'Login successful',
            token,
            user: {
              id: admin._id,
              email: admin.email,
              role: 'admin'
            }
          });
        }
      }
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    return res.status(400).json({ message: 'Please provide either a phone number or admin credentials' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
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
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User session not found. Please request a new OTP.' });
    }

    // Verify OTP
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    // Clear OTP details upon verification
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'OTP verified successfully',
      token,
      isProfileComplete: user.isProfileComplete,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name || "",
        email: user.email || "",
        gender: user.gender || "",
        profilePhoto: user.profilePhoto || ""
      }
    });

  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/auth/profile-setup
 * @desc    Submit user profile details (name, email, gender, profile photo) to finalize registration
 * @access  Private
 */
router.post('/profile-setup', authMiddleware, async (req, res) => {
  try {
    const { name, email, gender, profilePhoto } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Look up user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional email check to avoid duplicate emails if they enter a duplicate one
    if (email) {
      const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
      if (emailInUse) {
        return res.status(400).json({ message: 'Email address is already in use by another account' });
      }
      user.email = email;
    }

    user.name = name;
    user.gender = gender || null;
    user.profilePhoto = profilePhoto || null;
    user.isProfileComplete = true;

    await user.save();

    res.json({
      message: 'Profile set up successfully',
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email || "",
        gender: user.gender || "",
        profilePhoto: user.profilePhoto || "",
        isProfileComplete: user.isProfileComplete
      }
    });

  } catch (err) {
    console.error('Profile setup error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
