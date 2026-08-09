const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Coupon = require('../../models/Coupon');

// Helper to enrich transactions with Credit/Debit and In/Out flow labels + credit_amount and debit_amount keys
const enrichTransactions = (transactions) => {
  return transactions.map(tx => {
    const isCredit = tx.item && (tx.item.toLowerCase().includes('top-up') || tx.item.toLowerCase().includes('recharge') || tx.item.toLowerCase().includes('credit'));
    const amt = Number(tx.amount) || 0;
    const txObj = tx.toObject ? tx.toObject() : tx;
    return {
      ...txObj,
      transactionType: isCredit ? 'Credit' : 'Debit',
      flow: isCredit ? 'In' : 'Out',
      credit_amount: isCredit ? amt : 0,
      debit_amount: isCredit ? 0 : amt,
      creditAmount: isCredit ? amt : 0,
      debitAmount: isCredit ? 0 : amt
    };
  });
};

// Get wallet balance, ledger history, and special offers
router.get('/wallet', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({
      $or: [
        { user: user.name },
        { user: user.phone },
        { mobile: user.phone },
        { mobile: `+91 ${user.phone}` }
      ]
    }).sort({ createdAt: -1 });

    const enrichedTx = enrichTransactions(transactions);
    const totalCredit = enrichedTx.reduce((sum, tx) => sum + tx.credit_amount, 0);
    const totalDebit = enrichedTx.reduce((sum, tx) => sum + tx.debit_amount, 0);

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
        credit_amount: totalCredit,
        debit_amount: totalDebit,
        totalCreditAmount: totalCredit,
        totalDebitAmount: totalDebit,
        specialOffers,
        transactions: enrichedTx
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
