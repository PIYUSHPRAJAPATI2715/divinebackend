const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Coupon = require('../../models/Coupon');

// Helper to enrich transactions with Credit/Debit and In/Out flow labels
const enrichTransactions = (transactions) => {
  return transactions.map(tx => {
    const isCredit = tx.item && tx.item.toLowerCase().includes('top-up');
    return {
      ...tx.toObject(),
      transactionType: isCredit ? 'Credit' : 'Debit',
      flow: isCredit ? 'In' : 'Out'
    };
  });
};

// Get wallet balance, ledger history, and special offers
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

    // Fetch active discount coupons/special offers
    const activeCoupons = await Coupon.find({ isActive: true });
    
    // Default fallback offers if none are seeded in collection
    const defaultOffers = [
      {
        code: 'DIVINE50',
        description: 'Get ₹50 bonus on top-ups above ₹500',
        value: 50,
        discountType: 'Flat'
      },
      {
        code: 'WELCOMETRUST',
        description: 'Tax exemption certificate active for all donation transfers',
        value: 0,
        discountType: 'Percentage'
      }
    ];

    const specialOffers = activeCoupons.length > 0 
      ? activeCoupons.map(c => ({
          code: c.code,
          description: c.description,
          value: c.value,
          discountType: c.discountType
        }))
      : defaultOffers;

    res.json({
      status: true,
      data: {
        walletBalance: user.walletBalance || 0,
        specialOffers,
        transactions: enrichTransactions(transactions)
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
    
    res.json({ status: true, data: enrichTransactions(transactions) });
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
    
    res.json({ status: true, data: enrichTransactions(donations) });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
