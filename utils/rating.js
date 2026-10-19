const Review = require('../models/Review');
const Campaign = require('../models/Campaign');

/**
 * Calculates dynamic rating and reviews count for an NGO
 * Aggregates approved reviews for the NGO and its associated campaigns.
 * Never defaults to fake static ratings like 4.5.
 *
 * @param {Object} ngo - NGO document or object
 * @returns {Promise<Object>} Dynamic rating details and review counts
 */
async function calculateNgoDynamicRating(ngo) {
  if (!ngo) {
    return {
      rating: 0,
      ratingValue: 0,
      averageRating: 0,
      reviewsCount: 0,
      reviewCount: 0,
      totalReviews: 0,
      reviews: []
    };
  }

  const ngoId = ngo._id || ngo.id;
  const ngoName = (ngo.name || ngo.organizationName || '').trim();
  const orgName = (ngo.organizationName || ngo.name || '').trim();

  // 1. Find campaigns belonging to this NGO
  const campaignOr = [];
  if (ngoId) campaignOr.push({ ngoId: ngoId });
  if (ngoName) campaignOr.push({ user: ngoName });
  if (orgName && orgName !== ngoName) campaignOr.push({ user: orgName });

  let campaigns = [];
  if (campaignOr.length > 0) {
    try {
      campaigns = await Campaign.find({ $or: campaignOr }).select('_id title').lean();
    } catch (e) {
      campaigns = [];
    }
  }

  const campaignIds = campaigns.map(c => c._id);
  const campaignTitles = campaigns.map(c => c.title ? c.title.trim() : '').filter(Boolean);

  // 2. Build review matching criteria
  const reviewOrConditions = [];
  if (ngoName) {
    reviewOrConditions.push({
      targetName: { $regex: new RegExp(`^${ngoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
  }
  if (orgName && orgName !== ngoName) {
    reviewOrConditions.push({
      targetName: { $regex: new RegExp(`^${orgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
  }
  if (ngoId) {
    reviewOrConditions.push({ targetId: ngoId });
  }
  if (campaignIds.length > 0) {
    reviewOrConditions.push({ campaignId: { $in: campaignIds } });
  }
  if (campaignTitles.length > 0) {
    reviewOrConditions.push({ targetName: { $in: campaignTitles } });
  }

  let reviews = [];
  if (reviewOrConditions.length > 0) {
    try {
      reviews = await Review.find({
        $or: reviewOrConditions,
        status: 'Approved'
      }).sort({ createdAt: -1 }).lean();
    } catch (e) {
      reviews = [];
    }
  }

  let computedRating = 0;
  let reviewsCount = 0;

  if (reviews.length > 0) {
    const validRatings = reviews.filter(r => typeof r.rating === 'number' && r.rating > 0);
    if (validRatings.length > 0) {
      const sum = validRatings.reduce((acc, r) => acc + r.rating, 0);
      computedRating = Math.round((sum / validRatings.length) * 10) / 10;
      reviewsCount = validRatings.length;
    }
  } else if (typeof ngo.rating === 'number' && ngo.rating > 0) {
    // If explicitly stored on the NGO record
    computedRating = Math.round(ngo.rating * 10) / 10;
    reviewsCount = typeof ngo.reviewsCount === 'number' ? ngo.reviewsCount : (ngo.reviewCount || 0);
  }

  return {
    rating: computedRating,
    ratingValue: computedRating,
    averageRating: computedRating,
    reviewsCount,
    reviewCount: reviewsCount,
    totalReviews: reviewsCount,
    reviews
  };
}

/**
 * Batch calculate dynamic ratings for multiple NGOs
 */
async function calculateBatchNgoRatings(ngos) {
  if (!Array.isArray(ngos) || ngos.length === 0) return [];
  return Promise.all(ngos.map(ngo => calculateNgoDynamicRating(ngo)));
}

module.exports = {
  calculateNgoDynamicRating,
  calculateBatchNgoRatings
};
