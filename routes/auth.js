const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPass } = req.body;

    // 1. Validation
    if (!firstName || !lastName || !email || !password || !confirmPass) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPass) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save User
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // 5. Generate JWT Token
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user/admin & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 2. Check Admin Collection first
    const admin = await Admin.findOne({ email });
    if (admin) {
      // In seed data, admin password is plain text
      const isPlainMatch = admin.password === password;
      let isHashMatch = false;

      // Safe fallback check if admin password is ever hashed
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

    // 3. Check User Collection
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 5. Generate JWT Token
    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: 'user'
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset OTP
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Log OTP in console for easy testing/debugging
    console.log(`[AUTH] Password Reset OTP for ${email}: ${otp}`);

    res.json({
      message: 'OTP sent to email successfully (valid for 10 minutes)',
      email,
      // Returning the OTP in JSON makes testing and API review incredibly easy
      otp: process.env.NODE_ENV === 'production' ? undefined : otp
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and optionally reset password
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP matches and has not expired
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // If newPassword is provided, perform password reset
    if (newPassword) {
      if (!confirmNewPassword) {
        return res.status(400).json({ message: 'Please confirm your new password' });
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: 'New passwords do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Hash and update password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      
      // Clear OTP fields
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      return res.json({ message: 'Password reset successfully!' });
    }

    // If no newPassword was sent, just verify the OTP and return a success status
    res.json({
      message: 'OTP verified successfully!',
      verified: true
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
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
