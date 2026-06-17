const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

// Get wallet balance and ledger history
router.get('/wallet', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const transactions = await Transaction.find({
      $or: [
        { user: user.name },
        { user: user.phone },
        { user: `+91 ${user.phone}` }
      ]
    }).sort({ createdAt: -1 });
    
    res.json({
      status: true,
      data: {
        walletBalance: user.walletBalance || 0,
        transactions
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Transaction History ledger
router.get('/transactions', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const transactions = await Transaction.find({
      $or: [
        { user: user.name },
        { user: user.phone },
        { user: `+91 ${user.phone}` }
      ]
    }).sort({ createdAt: -1 });
    
    res.json({ status: true, data: transactions });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Donation History ledger
router.get('/donation-history', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const donations = await Transaction.find({
      $or: [
        { user: user.name },
        { user: user.phone },
        { user: `+91 ${user.phone}` }
      ],
      item: { $ne: 'Wallet Top-up' }
    }).sort({ createdAt: -1 });
    
    res.json({ status: true, data: donations });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
