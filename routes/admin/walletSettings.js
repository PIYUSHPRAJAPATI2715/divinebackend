const router = require('express').Router();
const WalletSettings = require('../../models/WalletSettings');
const User = require('../../models/User');

// Helper to get or create default wallet settings singleton
const getOrCreateSettings = async () => {
  let settings = await WalletSettings.findOne({ settingsId: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = new WalletSettings({
      settingsId: 'GLOBAL_SETTINGS',
      coinsPerRupee: 10, // 10 coins = ₹1
      coinRedeemLotSize: 2500, // Redeemable in lot of 2500 coins (= ₹250)
      cashbackExpiryDays: 15, // 15 days expiry
      cashbackMaxRedeemPercent: 20, // Max 20% of transaction amount
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

// 1. GET Global Wallet Settings & Pre-defined Recharge Tiers
router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ status: true, data: settings, settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. PUT Update Global Rules (Coins Rate, Lot Size, Cashback Expiry, Max Redeem %)
router.put('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    if (req.body.coinsPerRupee !== undefined) settings.coinsPerRupee = Number(req.body.coinsPerRupee);
    if (req.body.coinRedeemLotSize !== undefined) settings.coinRedeemLotSize = Number(req.body.coinRedeemLotSize);
    if (req.body.cashbackExpiryDays !== undefined) settings.cashbackExpiryDays = Number(req.body.cashbackExpiryDays);
    if (req.body.cashbackMaxRedeemPercent !== undefined) settings.cashbackMaxRedeemPercent = Number(req.body.cashbackMaxRedeemPercent);

    await settings.save();
    res.json({ status: true, message: 'Wallet settings updated successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 3. POST Add Pre-defined Recharge Cashback Tier
router.post('/tiers', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { amount, cashback, bonusCoins, badgeText, description } = req.body;

    if (!amount || cashback === undefined) {
      return res.status(400).json({ status: false, message: 'Amount and cashback values are required' });
    }

    const tierId = `TIER-${amount}-${Date.now().toString().slice(-4)}`;
    const newTier = {
      tierId,
      amount: Number(amount),
      cashback: Number(cashback),
      bonusCoins: Number(bonusCoins || 0),
      badgeText: badgeText || '',
      description: description || `Recharge ₹${amount} & get ₹${cashback} Cashback`,
      isActive: true
    };

    settings.predefinedRechargeTiers.push(newTier);
    await settings.save();

    res.status(201).json({ status: true, message: 'Recharge tier added successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 4. PUT Update Pre-defined Recharge Tier
router.put('/tiers/:tierId', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const tier = settings.predefinedRechargeTiers.find(t => t.tierId === req.params.tierId || String(t._id) === req.params.tierId);
    if (!tier) {
      return res.status(404).json({ status: false, message: 'Recharge tier not found' });
    }

    if (req.body.amount !== undefined) tier.amount = Number(req.body.amount);
    if (req.body.cashback !== undefined) tier.cashback = Number(req.body.cashback);
    if (req.body.bonusCoins !== undefined) tier.bonusCoins = Number(req.body.bonusCoins);
    if (req.body.badgeText !== undefined) tier.badgeText = req.body.badgeText;
    if (req.body.description !== undefined) tier.description = req.body.description;
    if (req.body.isActive !== undefined) tier.isActive = Boolean(req.body.isActive);

    await settings.save();
    res.json({ status: true, message: 'Recharge tier updated successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. DELETE Pre-defined Recharge Tier
router.delete('/tiers/:tierId', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    settings.predefinedRechargeTiers = settings.predefinedRechargeTiers.filter(t => t.tierId !== req.params.tierId && String(t._id) !== req.params.tierId);
    await settings.save();
    res.json({ status: true, message: 'Recharge tier deleted successfully', data: settings });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Admin User Balance Adjustment (Wallet / Cashback / Coins)
router.post('/adjust-user', async (req, res) => {
  try {
    const { userId, phone, action, type, amount, description } = req.body;
    let user = null;
    if (userId) user = await User.findById(userId);
    if (!user && phone) user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const value = Number(amount) || 0;
    const isAdd = action === 'add' || action === 'Credit';

    if (type === 'cashback') {
      if (isAdd) {
        const settings = await getOrCreateSettings();
        const expiryDays = settings.cashbackExpiryDays || 15;
        const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
        user.cashbackLedger.push({
          amount: value,
          remainingAmount: value,
          creditedAt: new Date(),
          expiresAt,
          source: description || 'Admin Cashback Adjustment',
          isExpired: false
        });
      }
    } else if (type === 'coins') {
      if (isAdd) {
        user.totalCoins = (user.totalCoins || 0) + value;
        user.coinsLedger.push({ coins: value, type: 'Earned', description: description || 'Admin Bonus Coins', createdAt: new Date() });
      } else {
        user.totalCoins = Math.max(0, (user.totalCoins || 0) - value);
        user.coinsLedger.push({ coins: value, type: 'Admin Adjustment', description: description || 'Admin Deducted Coins', createdAt: new Date() });
      }
    } else {
      // Main Wallet Balance
      if (isAdd) {
        user.walletBalance = (user.walletBalance || 0) + value;
      } else {
        user.walletBalance = Math.max(0, (user.walletBalance || 0) - value);
      }
    }

    // Recalculate active non-expired cashback
    const now = new Date();
    const activeLedger = user.cashbackLedger.filter(entry => !entry.isExpired && entry.expiresAt > now && entry.remainingAmount > 0);
    user.cashbackBalance = activeLedger.reduce((sum, entry) => sum + entry.remainingAmount, 0);

    await user.save();

    res.json({
      status: true,
      message: 'User wallet adjusted successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        walletBalance: user.walletBalance,
        cashbackBalance: user.cashbackBalance,
        totalCoins: user.totalCoins
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
