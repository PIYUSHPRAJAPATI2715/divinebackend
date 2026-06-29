const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Referral = require('../../models/Referral');

// Utility to generate unique referral code if missing
const generateReferralCode = (name) => {
  const prefix = name ? name.slice(0, 4).toUpperCase() : 'DIVINE';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randNum}`;
};

/**
 * @route   GET /api/donor/referrals/stats
 * @desc    Get logged-in user's referral stats (points, invite counts, history list)
 * @access  Private (Donor Portal)
 */
router.get('/referrals/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name);
      await user.save();
    }

    // Match referrals in Referral ledger using user name or phone (flexible match)
    const userNames = [];
    if (user.name) userNames.push(user.name);
    if (user.phone) {
      userNames.push(user.phone);
      userNames.push(`+91 ${user.phone}`);
    }

    const referrals = await Referral.find({
      referrerName: { $in: userNames }
    }).sort({ createdAt: -1 });

    // Calculate aggregations
    let totalEarnPoints = 0;
    let successfulReferral = 0;
    let referralThisMonth = 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    referrals.forEach(ref => {
      if (ref.status === 'Completed') {
        totalEarnPoints += ref.rewardAmount || 0;
        successfulReferral += 1;
      }
      if (ref.createdAt >= startOfMonth) {
        referralThisMonth += 1;
      }
    });

    res.json({
      status: true,
      data: {
        referralCode: user.referralCode,
        totalEarnPoints,
        totalReferral: referrals.length,
        successfulReferral,
        referralThisMonth,
        transactionsList: referrals.map(ref => ({
          referralId: ref.referralId,
          referredUserName: ref.referredUserName,
          rewardAmount: ref.rewardAmount,
          status: ref.status,
          date: ref.createdAt,
          createdAt: ref.createdAt
        }))
      }
    });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
