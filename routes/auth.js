const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Since this is a prototype, we'll do a simple plain-text comparison.
    // In production, use bcrypt: await bcrypt.compare(password, admin.password)
    if (admin.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Mock token generation (In production, use jsonwebtoken)
    const token = `mock-jwt-token-${admin._id}-${Date.now()}`;

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        email: admin.email
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
