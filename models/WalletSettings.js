const mongoose = require('mongoose');

const walletSettingsSchema = new mongoose.Schema({
  settingsId: { type: String, default: 'GLOBAL_SETTINGS' },
  // Coins Rules
  coinsPerRupee: { type: Number, default: 10 }, // 10 coins = ₹1
  coinRedeemLotSize: { type: Number, default: 2500 }, // Redeemable ONLY in lot of 2500 coins (= ₹250)
  
  // Cashback Rules
  cashbackExpiryDays: { type: Number, default: 15 }, // 15 days expiry
  cashbackMaxRedeemPercent: { type: Number, default: 20 }, // Max 20% of transaction amount
  
  // Pre-defined Recharge Cashback Tiers (Configurable by Admin)
  predefinedRechargeTiers: [
    {
      tierId: { type: String },
      amount: { type: Number, required: true },
      cashback: { type: Number, required: true },
      bonusCoins: { type: Number, default: 0 },
      badgeText: { type: String, default: '' },
      description: { type: String, default: '' },
      isActive: { type: Boolean, default: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('WalletSettings', walletSettingsSchema);
