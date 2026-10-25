const User = require('../models/User');
const NGO = require('../models/NGO');
const { buildPhoneFilter } = require('./phone');
const { enrichEntityPhotos } = require('./avatar');

/**
 * Robustly resolves all follower users for a given User or NGO entity.
 * Searches across:
 * 1. User's explicit followers array (user.followers)
 * 2. Any user where followingUsers includes user._id
 * 3. Any user where followingNgos includes user._id
 * 4. Any user where followingNgos includes any of the linked NGO._ids for this user
 * Deduplicates and returns enriched follower user objects.
 */
async function getAllFollowersForEntity(user) {
  if (!user) return [];

  const userId = (user._id || user.id || '').toString();
  if (!userId) return [];

  const targetIds = [userId];

  // Look for any linked NGO documents for this user
  try {
    const orNgoConditions = [
      { userId: user._id || user.id }
    ];
    if (user.email && typeof user.email === 'string' && user.email.trim()) {
      orNgoConditions.push({ email: user.email.trim() });
    }
    if (user.phone && typeof user.phone === 'string' && user.phone.trim()) {
      orNgoConditions.push(buildPhoneFilter(user.phone.trim()));
    }
    const orgName = (user.organizationName || user.name || '').trim();
    if (orgName && orgName !== 'Google User' && orgName !== 'Apple User' && orgName !== 'Divine Partner') {
      orNgoConditions.push({ name: orgName });
      orNgoConditions.push({ legalName: orgName });
    }

    const linkedNgos = await NGO.find({ $or: orNgoConditions }).select('_id name phone email').lean();
    linkedNgos.forEach(n => {
      if (n && n._id) {
        targetIds.push(n._id.toString());
      }
    });
  } catch (err) {
    console.error('Error finding linked NGOs for followers:', err.message);
  }

  // Find all users following any of these IDs
  let dbFollowers = [];
  try {
    const queryConditions = [
      { followingUsers: user._id || user.id },
      { followingNgos: { $in: targetIds } }
    ];

    dbFollowers = await User.find({
      $or: queryConditions,
      _id: { $ne: user._id || user.id },
      isDeleted: { $ne: true }
    }).select('_id name phone profilePhoto email role logo organizationName followers followingNgos followingUsers verified verifiedCampaignsCount').lean();
  } catch (err) {
    console.error('Error querying follower users:', err.message);
  }

  // Also include explicit user.followers if populated or present
  let explicitUsers = [];
  try {
    const explicitIds = (user.followers || []).map(f => {
      return (f && f._id ? f._id : f).toString();
    }).filter(id => id && id !== userId);

    if (explicitIds.length > 0) {
      explicitUsers = await User.find({
        _id: { $in: explicitIds },
        isDeleted: { $ne: true }
      }).select('_id name phone profilePhoto email role logo organizationName followers followingNgos followingUsers verified verifiedCampaignsCount').lean();
    }
  } catch (err) {
    console.error('Error querying explicit followers:', err.message);
  }

  // Merge and deduplicate by user _id
  const seenMap = new Map();
  [...dbFollowers, ...explicitUsers].forEach(u => {
    if (u && u._id) {
      const uId = u._id.toString();
      if (uId !== userId && !seenMap.has(uId)) {
        seenMap.set(uId, u);
      }
    }
  });

  return Array.from(seenMap.values());
}

/**
 * Formats a follower item with all possible keys for mobile app backward-compatibility
 */
function formatFollowerItem(f, followingSet = new Set()) {
  const fId = (f._id || f.id).toString();
  const photos = enrichEntityPhotos(f, f.role === 'ngo' ? 'ngo' : 'user');
  const fName = f.name || f.organizationName || 'Divine Contributor';
  const fRole = f.role || 'donor';
  const isNgo = fRole === 'ngo';

  return {
    _id: f._id,
    id: f._id,
    name: fName,
    userName: fName,
    organizationName: f.organizationName || fName,
    contactPerson: fName,
    phone: f.phone || '',
    email: f.email || '',
    role: fRole,
    type: isNgo ? 'ngo' : 'user',
    isFollower: true,
    isFollowing: followingSet.has(fId),
    verified: f.verified || false,
    verifiedCampaignsCount: f.verifiedCampaignsCount || 0,
    followersCount: (f.followers || []).length,
    rating: 5.0,
    averageRating: 5.0,
    totalReviews: 0,
    ...photos
  };
}

module.exports = {
  getAllFollowersForEntity,
  formatFollowerItem
};
