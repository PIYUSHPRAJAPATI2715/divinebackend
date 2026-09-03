const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Coupon = require('../../models/Coupon');
const WalletSettings = require('../../models/WalletSettings');

// Helper to get or create global wallet settings
const getWalletSettings = async () => {
  let settings = await WalletSettings.findOne({ settingsId: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = new WalletSettings({
      settingsId: 'GLOBAL_SETTINGS',
      coinsPerRupee: 10,
      coinRedeemLotSize: 2500,
      cashbackExpiryDays: 15,
      cashbackMaxRedeemPercent: 20,
      predefinedRechargeTiers: [
        { tierId: 'TIER-100', amount: 100, cashback: 10, bonusCoins: 100, badgeText: '', description: 'Recharge ₹100 & get ₹10 Cashback + 100 Coins', isActive: true },
        { tierId: 'TIER-500', amount: 500, cashback: 50, bonusCoins: 500, badgeText: 'Popular', description: 'Recharge ₹500 & get ₹50 Cashback + 500 Coins', isActive: true },
        { tierId: 'TIER-1000', amount: 1000, cashback: 150, bonusCoins: 1000, badgeText: 'Best Value', description: 'Recharge ₹1,000 & get ₹150 Cashback + 1,000 Coins', isActive: true },
        { tierId: 'TIER-2000', amount: 2000, cashback: 400, bonusCoins: 2500, badgeText: 'Super Saver', description: 'Recharge ₹2,000 & get ₹400 Cashback + 2,500 Coins', isActive: true },
        { tierId: 'TIER-5000', amount: 5000, cashback: 1200, bonusCoins: 5000, badgeText: 'Mega Booster', description: 'Recharge ₹5,000 & get ₹1,200 Cashback + 5,000 Coins', isActive: true }
      ]
    });
    await settings.save();
  }
  return settings;
};

// Helper: Clean expired cashback entries for user & recalculate active cashback balance
const cleanAndCalculateUserCashback = (user) => {
  const now = new Date();
  if (!user.cashbackLedger) user.cashbackLedger = [];

  user.cashbackLedger.forEach(entry => {
    if (entry.expiresAt && new Date(entry.expiresAt) < now) {
      entry.isExpired = true;
    }
  });

  const activeEntries = user.cashbackLedger.filter(entry => !entry.isExpired && (Number(entry.remainingAmount) || 0) > 0);
  const activeBalance = activeEntries.reduce((sum, entry) => sum + (Number(entry.remainingAmount) || 0), 0);
  user.cashbackBalance = activeBalance;
  return activeBalance;
};

// Helper to enrich transactions with Credit/Debit and In/Out flow labels
const enrichTransactions = (transactions) => {
  return transactions.map(tx => {
    const isCredit = tx.item && (tx.item.toLowerCase().includes('top-up') || tx.item.toLowerCase().includes('recharge') || tx.item.toLowerCase().includes('credit') || tx.item.toLowerCase().includes('cashback'));
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

// 1. GET Wallet Summary (Main Balance, 15-day Cashback, 2500 Coins Lot Status, Tiers)
router.get('/wallet', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const settings = await getWalletSettings();
    cleanAndCalculateUserCashback(user);
    await user.save();

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

    const coinsPerRupee = settings.coinsPerRupee || 10;
    const lotSize = settings.coinRedeemLotSize || 2500;
    const totalCoins = user.totalCoins || 0;
    const isCoinRedeemable = totalCoins >= lotSize;
    const lotValueInRupees = lotSize / coinsPerRupee; // 2500 / 10 = ₹250

    const activeTiers = settings.predefinedRechargeTiers.filter(t => t.isActive);

    res.json({
      status: true,
      data: {
        walletBalance: user.walletBalance || 0,
        cashbackBalance: user.cashbackBalance || 0,
        totalCoins: totalCoins,
        coinsValueInRupees: (totalCoins / coinsPerRupee),
        
        // Coins redemption rules
        coinRedeemRules: {
          lotSize: lotSize, // 2500 coins per lot
          lotValueInRupees: lotValueInRupees, // ₹250 per lot
          isRedeemable: isCoinRedeemable,
          coinsPerRupee: coinsPerRupee,
          redeemNote: `Divine Coins are redeemable in fixed lots of ${lotSize} coins = ₹${lotValueInRupees} discount per transaction.`
        },

        // Cashback expiry rules
        cashbackRules: {
          expiryDays: settings.cashbackExpiryDays || 15,
          maxRedeemPercent: settings.cashbackMaxRedeemPercent || 20,
          redeemNote: `Cashback balance carries 15 days expiry. Maximum ${settings.cashbackMaxRedeemPercent || 20}% of transaction value can be redeemed using cashback.`
        },

        // Pre-defined Recharge Cashback Tiers
        predefinedRechargeTiers: activeTiers,
        rechargeOffers: activeTiers,

        credit_amount: totalCredit,
        debit_amount: totalDebit,
        totalCreditAmount: totalCredit,
        totalDebitAmount: totalDebit,
        transactions: enrichedTx
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. POST Wallet Top-up with Pre-defined Cashback Tiers & 15-day Expiry
router.post('/wallet/topup', async (req, res) => {
  try {
    const { amount, tierId } = req.body;
    const rechargeAmount = Number(amount);
    if (!rechargeAmount || rechargeAmount <= 0) {
      return res.status(400).json({ status: false, message: 'Valid top-up amount is required' });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const settings = await getWalletSettings();
    cleanAndCalculateUserCashback(user);

    // Find matching predefined tier or check exact tierId
    let matchingTier = null;
    if (tierId) {
      matchingTier = settings.predefinedRechargeTiers.find(t => t.tierId === tierId || String(t._id) === tierId);
    }
    if (!matchingTier) {
      matchingTier = settings.predefinedRechargeTiers.find(t => t.isActive && t.amount === rechargeAmount);
    }

    const cashbackEarned = matchingTier ? matchingTier.cashback : 0;
    const coinsEarned = matchingTier ? (matchingTier.bonusCoins || rechargeAmount) : rechargeAmount;

    // Credit main wallet balance
    user.walletBalance = (user.walletBalance || 0) + rechargeAmount;

    // Credit cashback with 15 days expiry
    const expiryDays = settings.cashbackExpiryDays || 15;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    if (cashbackEarned > 0) {
      user.cashbackLedger.push({
        amount: cashbackEarned,
        remainingAmount: cashbackEarned,
        creditedAt: new Date(),
        expiresAt,
        source: `Recharge ₹${rechargeAmount} Tier`,
        isExpired: false
      });
      user.cashbackBalance = (user.cashbackBalance || 0) + cashbackEarned;
    }

    // Credit Divine Coins (No Expiry)
    if (coinsEarned > 0) {
      user.totalCoins = (user.totalCoins || 0) + coinsEarned;
      user.coinsLedger.push({
        coins: coinsEarned,
        type: 'Earned',
        description: `Recharge Bonus ₹${rechargeAmount}`,
        createdAt: new Date()
      });
    }

    await user.save();

    // Log Transaction
    const newTx = new Transaction({
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      user: user.name || user.phone,
      mobile: user.phone,
      item: `Wallet Recharge ₹${rechargeAmount}`,
      amount: rechargeAmount,
      status: 'Success'
    });
    await newTx.save();

    try {
      const { createAndSendNotification } = require('../../utils/notification');
      await createAndSendNotification({
        userId: user._id,
        title: 'Wallet Recharged Successfully! 💳',
        body: `₹${rechargeAmount} added to your wallet! New balance: ₹${user.walletBalance}.`,
        type: 'wallet',
        screen: 'wallet',
        dataId: String(user._id)
      });
    } catch (notifErr) {
      console.error('Wallet recharge notification error:', notifErr.message);
    }

    res.json({
      status: true,
      message: `Top-up successful! Added ₹${rechargeAmount} to wallet. Earned ₹${cashbackEarned} Cashback (expires in 15 days) & ${coinsEarned} Divine Coins.`,
      data: {
        walletBalance: user.walletBalance,
        cashbackBalance: user.cashbackBalance,
        totalCoins: user.totalCoins,
        rechargeAmount,
        cashbackEarned,
        cashbackExpiresAt: expiresAt,
        coinsEarned
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. POST Wallet Payment / Donation Checkout (Applies 20% Cashback Limit & 2500 Coins Lot Rule)
router.post('/wallet/pay', async (req, res) => {
  try {
    const { amount, useCashback = false, useCoins = false } = req.body;
    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ status: false, message: 'Valid payment amount is required' });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const settings = await getWalletSettings();
    const activeCashback = cleanAndCalculateUserCashback(user);

    let cashbackDeducted = 0;
    let coinsRedeemed = 0;
    let coinsDiscountAmount = 0;

    // Rule 1: Cashback Expiry & Max 20% Redemption per transaction
    if (useCashback && activeCashback > 0) {
      const maxPercent = settings.cashbackMaxRedeemPercent || 20;
      const maxAllowedByPercent = (maxPercent / 100) * totalAmount;
      cashbackDeducted = Math.min(activeCashback, maxAllowedByPercent);

      // Deduct from cashback ledger (FIFO order)
      let remainingToDeduct = cashbackDeducted;
      for (const entry of user.cashbackLedger) {
        if (!entry.isExpired && entry.remainingAmount > 0 && remainingToDeduct > 0) {
          const deductFromEntry = Math.min(entry.remainingAmount, remainingToDeduct);
          entry.remainingAmount -= deductFromEntry;
          remainingToDeduct -= deductFromEntry;
        }
      }
      user.cashbackBalance = Math.max(0, user.cashbackBalance - cashbackDeducted);
    }

    // Rule 2: Divine Coins 2500 Lot Redemption (Fixed lot of 2500, no expiry)
    if (useCoins) {
      const lotSize = settings.coinRedeemLotSize || 2500;
      const coinsPerRupee = settings.coinsPerRupee || 10;

      if ((user.totalCoins || 0) < lotSize) {
        return res.status(400).json({
          status: false,
          message: `Divine Coins can only be redeemed in lots of ${lotSize} coins. You currently have ${user.totalCoins || 0} coins.`
        });
      }

      // Redeem EXACTLY 2500 coins per transaction
      coinsRedeemed = lotSize;
      coinsDiscountAmount = lotSize / coinsPerRupee; // 2500 / 10 = ₹250

      user.totalCoins -= lotSize;
      user.coinsLedger.push({
        coins: lotSize,
        type: 'Redeemed',
        description: `Redeemed ${lotSize} coins for ₹${coinsDiscountAmount} discount`,
        createdAt: new Date()
      });
    }

    const netAmountToPay = Math.max(0, totalAmount - cashbackDeducted - coinsDiscountAmount);

    if ((user.walletBalance || 0) < netAmountToPay) {
      return res.status(400).json({
        status: false,
        message: `Insufficient wallet balance. Total amount: ₹${totalAmount}, Cashback: ₹${cashbackDeducted}, Coins Discount: ₹${coinsDiscountAmount}, Remaining Wallet Needed: ₹${netAmountToPay}. Current Wallet Balance: ₹${user.walletBalance}. Please recharge.`
      });
    }

    // Deduct remaining from main wallet balance
    user.walletBalance -= netAmountToPay;
    await user.save();

    // Log Transaction
    const newTx = new Transaction({
      transactionId: `TXN-${Date.now().toString().slice(-6)}`,
      user: user.name || user.phone,
      mobile: user.phone,
      item: `Wallet Payment (Cashback: ₹${cashbackDeducted}, Coins: ${coinsRedeemed})`,
      amount: totalAmount,
      status: 'Success'
    });
    await newTx.save();

    res.json({
      status: true,
      message: 'Payment completed successfully using wallet!',
      data: {
        totalAmount,
        cashbackDeducted,
        coinsRedeemed,
        coinsDiscountAmount,
        walletDeducted: netAmountToPay,
        remainingWalletBalance: user.walletBalance,
        remainingCashbackBalance: user.cashbackBalance,
        remainingCoins: user.totalCoins
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Transaction History ledger
router.get('/transactions', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
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

module.exports = router;
