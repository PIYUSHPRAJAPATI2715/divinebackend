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
const handleReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name);
      await user.save();
    }

    const userNames = [];
    if (user.name) userNames.push(user.name);
    if (user.phone) {
      userNames.push(user.phone);
      userNames.push(`+91 ${user.phone}`);
    }

    const referrals = await Referral.find({
      referrerName: { $in: userNames }
    }).sort({ createdAt: -1 });

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

    const formattedList = referrals.map(ref => ({
      referralId: ref.referralId,
      referredUserName: ref.referredUserName,
      rewardAmount: ref.rewardAmount || 0,
      coins: ref.rewardAmount || 0,
      status: ref.status || 'Pending',
      date: ref.createdAt,
      createdAt: ref.createdAt
    }));

    const responsePayload = {
      referralCode: user.referralCode,
      rewards: totalEarnPoints,
      totalRewards: totalEarnPoints,
      rewardAmount: totalEarnPoints,
      totalCoins: totalEarnPoints,
      coins: totalEarnPoints,
      totalRewardCoins: totalEarnPoints,
      totalEarnPoints: totalEarnPoints,
      totalReferral: referrals.length,
      successfulReferral,
      referralThisMonth,
      transactionList: formattedList,
      transactionsList: formattedList,
      transactions: formattedList,
      transaction_list: formattedList,
      history: formattedList
    };

    res.json({
      status: true,
      data: responsePayload,
      ...responsePayload
    });

  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

router.get('/referrals/stats', handleReferralStats);
router.get('/referrals', handleReferralStats);
router.get('/referrals/my', handleReferralStats);
router.get('/referrals/history', handleReferralStats);

module.exports = router;
module.exports.handleReferralStats = handleReferralStats;
