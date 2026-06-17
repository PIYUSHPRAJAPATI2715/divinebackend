const express = require('express');
const router = express.Router();
const User = require('../../../models/User');
const Transaction = require('../../../models/Transaction');

// Get all dynamic transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json({ status: true, data: transactions });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Adjust donor wallet balance dynamically
router.post('/wallet/adjust', async (req, res) => {
  try {
    const { userId, amount, action } = req.body; // action: 'credit' or 'debit'
    if (!userId || !amount || !action) {
      return res.status(400).json({ status: false, message: 'userId, amount, and action are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const value = Number(amount);
    if (action === 'credit') {
      user.walletBalance = (user.walletBalance || 0) + value;
    } else if (action === 'debit') {
      if ((user.walletBalance || 0) < value) {
        return res.status(400).json({ status: false, message: 'Insufficient balance to deduct' });
      }
      user.walletBalance -= value;
    } else {
      return res.status(400).json({ status: false, message: 'Invalid adjust action' });
    }

    await user.save();

    // Create transaction ledger entry
    const tx = new Transaction({
      transactionId: `TXN-${Date.now().toString().slice(-4)}`,
      user: user.name || user.phone,
      amount: `₹${value.toLocaleString()}`,
      status: 'Approved',
      item: `Admin Balance adjustment (${action === 'credit' ? 'Credited' : 'Debited'})`
    });
    await tx.save();

    res.json({ status: true, message: 'Wallet balance adjusted successfully', walletBalance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
