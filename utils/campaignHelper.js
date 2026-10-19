const Campaign = require('../models/Campaign');

/**
 * Calculates remaining days for a campaign.
 * If the endDate has expired, returns 0.
 */
const calculateDaysLeft = (campaign, now = new Date()) => {
  if (!campaign) return 0;
  if (campaign.endDate) {
    const diffTime = new Date(campaign.endDate).getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  if (campaign.createdAt) {
    const defaultDurationDays = Number(campaign.daysLeft) || 30;
    const diffTime = (new Date(campaign.createdAt).getTime() + defaultDurationDays * 24 * 60 * 60 * 1000) - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  return Number(campaign.daysLeft) || 30;
};

/**
 * Checks whether a campaign has expired based on its endDate.
 */
const isCampaignExpired = (campaign, now = new Date()) => {
  if (!campaign) return false;
  if (campaign.status === 'Completed') return true;
  if (campaign.endDate) {
    return new Date(campaign.endDate).getTime() <= now.getTime();
  }
  return false;
};

/**
 * Automatically transitions any 'Live' campaigns whose end date has passed to 'Completed'.
 */
const syncExpiredCampaigns = async () => {
  try {
    const now = new Date();
    const result = await Campaign.updateMany(
      {
        status: 'Live',
        endDate: { $ne: null, $lte: now }
      },
      {
        $set: { status: 'Completed' }
      }
    );
    if (result && result.modifiedCount > 0) {
      console.log(`[syncExpiredCampaigns] Marked ${result.modifiedCount} expired campaign(s) as Completed.`);
    }
  } catch (err) {
    console.warn('[syncExpiredCampaigns] Warning:', err.message);
  }
};

/**
 * Returns a MongoDB query filter for active, ongoing, unexpired campaigns.
 */
const getActiveCampaignsQuery = (extraFilter = {}) => {
  const now = new Date();
  return {
    status: 'Live',
    isActive: { $ne: false },
    isVerified: true,
    verificationStatus: 'Approved',
    $or: [
      { endDate: null },
      { endDate: { $exists: false } },
      { endDate: { $gt: now } }
    ],
    ...extraFilter
  };
};

module.exports = {
  calculateDaysLeft,
  isCampaignExpired,
  syncExpiredCampaigns,
  getActiveCampaignsQuery
};
