const router = require('express').Router();
const Campaign = require('../../models/Campaign');
const NGO = require('../../models/NGO');
const User = require('../../models/User');
const { buildPhoneFilter, findUserByPhone } = require('../../utils/phone');
const { resolveEntityPhoto } = require('../../utils/avatar');
const { syncExpiredCampaigns, calculateDaysLeft, isCampaignExpired, getActiveCampaignsQuery } = require('../../utils/campaignHelper');

const resolveCampaignCreator = async (campaign) => {
  let creatorUser = null;
  let creatorNGO = null;

  if (campaign.userId) {
    creatorUser = await User.findById(campaign.userId);
  }
  if (campaign.ngoId) {
    creatorNGO = await NGO.findById(campaign.ngoId);
  }
  if (!creatorUser && !creatorNGO && campaign.userPhone) {
    creatorUser = await findUserByPhone(campaign.userPhone, User);
    creatorNGO = await NGO.findOne(buildPhoneFilter(campaign.userPhone));
  }

  if (!creatorUser && !creatorNGO && campaign.user && campaign.user !== 'Divine Donor' && campaign.user !== 'Divine Owner') {
    const cleanUser = campaign.user.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    creatorNGO = await NGO.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanUser}$`, 'i') } },
        { organizationName: { $regex: new RegExp(`^${cleanUser}$`, 'i') } }
      ]
    });
    creatorUser = await User.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanUser}$`, 'i') } },
        { organizationName: { $regex: new RegExp(`^${cleanUser}$`, 'i') } }
      ]
    });
  }

  if (!creatorUser && !creatorNGO && campaign.bankDetails && campaign.bankDetails.holderName && campaign.bankDetails.holderName.trim() !== '') {
    const hName = campaign.bankDetails.holderName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    creatorNGO = await NGO.findOne({
      $or: [
        { name: { $regex: new RegExp(hName, 'i') } },
        { bankAccountHolder: { $regex: new RegExp(hName, 'i') } }
      ]
    });
    creatorUser = await User.findOne({
      $or: [
        { name: { $regex: new RegExp(hName, 'i') } }
      ]
    });
  }

  const name = (campaign.user && campaign.user !== 'Divine Donor' && campaign.user !== 'Divine Owner' && campaign.user.trim() !== '') 
    ? campaign.user 
    : (creatorNGO?.name || creatorNGO?.organizationName || creatorUser?.name || creatorUser?.organizationName || 'Divine Organizer');

  const photo = resolveEntityPhoto(creatorNGO || creatorUser, creatorNGO ? 'ngo' : 'user');
  const phone = creatorNGO?.phone || creatorUser?.phone || '';
  const email = creatorNGO?.email || creatorUser?.email || '';
  const role = creatorNGO ? 'ngo' : (creatorUser?.role || 'ngo');
  const id = creatorNGO?._id || creatorUser?._id || campaign._id;
  const address = creatorNGO?.registeredAddress || creatorUser?.registeredAddress || '';

  const profileObj = {
    _id: id,
    name: name,
    organizationName: name,
    phone: phone,
    email: email,
    role: role,
    profilePhoto: photo,
    logo: photo,
    registeredAddress: address
  };

  return {
    name,
    photo,
    profileObj
  };
};

const normalizeImageUrl = (urlStr, req) => {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '' || urlStr.includes('catbox.moe')) {
    return 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800';
  }
  let clean = urlStr.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (req && (clean.includes('localhost:') || clean.includes('127.0.0.1:'))) {
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const host = req.get('host');
      const parts = clean.split('/uploads/');
      if (parts.length > 1) {
        return `${protocol}://${host}/uploads/${parts[1]}`;
      }
    }
    return clean;
  }
  if (req) {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const pathPart = clean.startsWith('/') ? clean : `/${clean}`;
    return `${protocol}://${host}${pathPart}`;
  }
  return clean;
};

const enrichCampaign = async (campaignDoc, req = null) => {
  const c = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(c);

  const now = new Date();
  const isExpired = isCampaignExpired(c, now);
  const days = calculateDaysLeft(c, now);
  let currentStatus = c.status;
  if (isExpired && currentStatus === 'Live') {
    currentStatus = 'Completed';
  }

  const rawImages = (Array.isArray(c.images) && c.images.length > 0)
    ? c.images
    : [c.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800'];

  const normalizedImages = rawImages
    .filter(img => typeof img === 'string' && img.trim() !== '')
    .map(img => normalizeImageUrl(img, req));

  const primaryImage = normalizedImages.length > 0
    ? normalizedImages[0]
    : normalizeImageUrl(c.imageUrl, req);

  const isCampaignVerified = Boolean(c.isVerified === true || currentStatus === 'Live' || currentStatus === 'Completed');
  const isCampaignActive = Boolean(c.isActive !== false && currentStatus !== 'Inactive');

  return {
    ...c,
    status: currentStatus,
    isCompleted: isExpired || currentStatus === 'Completed',
    isExpired: isExpired,
    activate: isCampaignActive,
    active: isCampaignActive,
    isActive: isCampaignActive,
    is_active: isCampaignActive,
    activated: isCampaignActive,
    verify: isCampaignVerified,
    verified: isCampaignVerified,
    isVerified: isCampaignVerified,
    is_verified: isCampaignVerified,
    verificationStatus: currentStatus === 'Rejected' 
      ? 'Rejected' 
      : (isCampaignVerified ? 'Approved' : (c.verificationStatus || 'Pending')),
    imageUrl: primaryImage,
    images: normalizedImages,
    user: creatorName,
    userName: creatorName,
    user_name: creatorName,
    creatorName: creatorName,
    creator_name: creatorName,
    fundraiserName: creatorName,
    fundraiser_name: creatorName,
    fundraiser: creatorName,
    userImage: creatorPhoto,
    user_image: creatorPhoto,
    userLogo: creatorPhoto,
    profilePhoto: creatorPhoto,
    creatorImage: creatorPhoto,
    creatorPhoto: creatorPhoto,
    fundraiserImage: creatorPhoto,
    fundraiser_image: creatorPhoto,
    fundraiserLogo: creatorPhoto,
    fundraiserPhoto: creatorPhoto,
    userProfile: creatorProfile,
    creatorProfile: creatorProfile,
    fundraiserProfile: creatorProfile,
    daysLeft: days,
    donorsCount: c.donorsCount || 0
  };
};

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    // Automatically transition expired campaigns to 'Completed'
    await syncExpiredCampaigns();

    const filter = {};
    const now = new Date();
    if (req.query.status && req.query.status !== 'All') {
      filter.status = req.query.status;
      if (req.query.status === 'Live') {
        filter.$or = [
          { endDate: null },
          { endDate: { $exists: false } },
          { endDate: { $gt: now } }
        ];
      }
    }
    const isAdminRoute = req.baseUrl && req.baseUrl.startsWith('/api/admin');
    if (!isAdminRoute && !req.query.my && req.query.user !== 'me') {
      filter.status = 'Live';
      filter.isActive = { $ne: false };
      filter.isVerified = true;
      filter.verificationStatus = 'Approved';
      filter.$or = [
        { endDate: null },
        { endDate: { $exists: false } },
        { endDate: { $gt: now } }
      ];
    }
    if (req.query.my === 'true' || req.query.user === 'me' || req.query.filter === 'my') {
      const userId = req.user ? (req.user._id || req.user.id) : null;
      if (!userId) {
        return res.json([]);
      }
      filter.userId = userId;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }
    const campaigns = await Campaign.find(filter).sort({ createdAt: -1 });
    const enriched = await Promise.all(campaigns.map(c => enrichCampaign(c, req)));

    if (!isAdminRoute && !req.query.my && req.query.user !== 'me') {
      const validEnriched = enriched.filter(c => !isCampaignExpired(c, now) && c.daysLeft > 0);
      return res.json(validEnriched);
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single campaign detailed page
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Fundraising campaign not found' });
    const enriched = await enrichCampaign(campaign);
    res.json({ status: true, data: enriched, ...enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new campaign
router.post('/', async (req, res) => {
  try {
    const { title, goal, imageUrl, images } = req.body;
    if (!title || !goal) {
      return res.status(400).json({ status: false, message: 'Title and Goal amount are required' });
    }

    const cleanTitle = String(title).trim();
    if (!cleanTitle) {
      return res.status(400).json({ status: false, message: 'Title cannot be empty' });
    }

    const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRegex = new RegExp(`^\\s*${escapedTitle}\\s*$`, 'i');

    // 1. Duplicate check: Check if current account already submitted this campaign
    const userConditions = [];
    if (req.user?._id) userConditions.push({ userId: req.user._id });
    if (req.user?.id) userConditions.push({ userId: req.user.id });
    if (req.user?.phone) userConditions.push({ userPhone: req.user.phone });
    if (req.body.user && String(req.body.user).trim()) userConditions.push({ user: String(req.body.user).trim() });

    if (userConditions.length > 0) {
      const userDuplicate = await Campaign.findOne({
        title: titleRegex,
        $or: userConditions
      });
      if (userDuplicate) {
        return res.status(400).json({
          status: false,
          message: `A campaign with the title "${cleanTitle}" has already been submitted by this account.`
        });
      }
    }

    // 2. Duplicate check: Check if an active or pending campaign already exists platform-wide
    const platformDuplicate = await Campaign.findOne({
      title: titleRegex,
      status: { $in: ['Live', 'Pending'] }
    });
    if (platformDuplicate) {
      return res.status(400).json({
        status: false,
        message: `A campaign with the title "${cleanTitle}" is already active or awaiting approval. Please use a unique title.`
      });
    }

    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    const isAdmin = Boolean(req.user && req.user.role === 'admin');
    const isAdminRoute = Boolean(req.baseUrl && req.baseUrl.startsWith('/api/admin'));

    // Status assignment: Only an admin can immediately create a Live campaign
    let status = 'Pending';
    let isVerified = false;
    let verificationStatus = 'Pending';
    let isActive = false;

    if (isAdmin || (isAdminRoute && req.body.status)) {
      status = req.body.status || 'Live';
      if (status === 'Live') {
        isVerified = true;
        verificationStatus = 'Approved';
        isActive = true;
      } else if (status === 'Rejected') {
        isVerified = false;
        verificationStatus = 'Rejected';
        isActive = false;
      } else {
        isVerified = false;
        verificationStatus = 'Pending';
        isActive = false;
      }
    }

    const newCampaign = new Campaign({
      ...req.body,
      title: cleanTitle,
      imageUrl: finalCoverImage,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      status,
      isVerified,
      verificationStatus,
      isActive
    });
    const savedCampaign = await newCampaign.save();
    const enriched = await enrichCampaign(savedCampaign, req);
    res.status(201).json({
      status: true,
      message: (status === 'Live') 
        ? 'Campaign created and published successfully' 
        : 'Campaign submitted for review successfully. It will be published upon admin approval.',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Update a campaign
router.put('/:id', async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: req.params.id });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const prevStatus = campaign.status;
    const { status, isVerified, verify, isActive, activate, ...otherFields } = req.body;

    Object.assign(campaign, otherFields);

    if (status !== undefined) {
      const s = String(status).trim();
      if (s === 'Live' || s === 'Approved') {
        campaign.status = 'Live';
        campaign.isVerified = true;
        campaign.verificationStatus = 'Approved';
        campaign.isActive = true;
      } else if (s === 'Rejected') {
        campaign.status = 'Rejected';
        campaign.isVerified = false;
        campaign.verificationStatus = 'Rejected';
        campaign.isActive = false;
      } else if (s === 'Inactive') {
        campaign.status = 'Inactive';
        campaign.isActive = false;
      } else {
        campaign.status = s;
      }
    }

    if (isVerified !== undefined || verify !== undefined) {
      const v = Boolean(isVerified ?? verify);
      campaign.isVerified = v;
      if (v) {
        campaign.verificationStatus = 'Approved';
        if (campaign.status === 'Pending') campaign.status = 'Live';
        campaign.isActive = true;
      } else {
        campaign.verificationStatus = 'Pending';
      }
    }

    if (isActive !== undefined || activate !== undefined) {
      const a = Boolean(isActive ?? activate);
      campaign.isActive = a;
      if (!a && campaign.status === 'Live') {
        campaign.previousStatus = campaign.status;
        campaign.status = 'Inactive';
      } else if (a && campaign.status === 'Inactive') {
        campaign.status = (campaign.isVerified || campaign.previousStatus === 'Live') ? 'Live' : 'Pending';
      }
    }

    await campaign.save();

    // Trigger push notification if status transitioned
    if (campaign.status === 'Live' && prevStatus !== 'Live' && campaign.userId) {
      try {
        const { createAndSendNotification } = require('../../utils/notification');
        await createAndSendNotification({
          userId: campaign.userId,
          title: 'Campaign Approved! 🎉',
          body: `Your fundraising campaign "${campaign.title}" has been reviewed and approved by admin. It is now live!`,
          type: 'campaign',
          screen: 'campaign_details',
          dataId: String(campaign._id)
        });
      } catch (notifErr) {
        console.error('Campaign approve notification error:', notifErr.message);
      }
    } else if (campaign.status === 'Rejected' && prevStatus !== 'Rejected' && campaign.userId) {
      try {
        const { createAndSendNotification } = require('../../utils/notification');
        await createAndSendNotification({
          userId: campaign.userId,
          title: 'Campaign Review Update ⚠️',
          body: `Your fundraising campaign "${campaign.title}" could not be approved at this time.`,
          type: 'campaign',
          screen: 'campaign_details',
          dataId: String(campaign._id)
        });
      } catch (notifErr) {
        console.error('Campaign reject notification error:', notifErr.message);
      }
    }

    const enriched = await enrichCampaign(campaign, req);
    res.json({
      status: true,
      message: 'Campaign updated successfully',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Dedicated Admin Approve endpoint
const handleAdminApprove = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: req.params.id });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    campaign.status = 'Live';
    campaign.isVerified = true;
    campaign.verificationStatus = 'Approved';
    campaign.isActive = true;
    await campaign.save();

    if (campaign.userId) {
      try {
        const { createAndSendNotification } = require('../../utils/notification');
        await createAndSendNotification({
          userId: campaign.userId,
          title: 'Campaign Approved! 🎉',
          body: `Your fundraising campaign "${campaign.title}" has been reviewed and approved by admin. It is now live!`,
          type: 'campaign',
          screen: 'campaign_details',
          dataId: String(campaign._id)
        });
      } catch (notifErr) {
        console.error('Approve notification error:', notifErr.message);
      }
    }

    const enriched = await enrichCampaign(campaign, req);
    res.json({
      status: true,
      message: 'Campaign approved successfully and is now Live',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Dedicated Admin Reject endpoint
const handleAdminReject = async (req, res) => {
  try {
    let campaign = await Campaign.findById(req.params.id).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: req.params.id });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    campaign.status = 'Rejected';
    campaign.isVerified = false;
    campaign.verificationStatus = 'Rejected';
    campaign.isActive = false;
    if (req.body.reason) campaign.rejectionReason = req.body.reason;
    await campaign.save();

    if (campaign.userId) {
      try {
        const { createAndSendNotification } = require('../../utils/notification');
        await createAndSendNotification({
          userId: campaign.userId,
          title: 'Campaign Review Update ⚠️',
          body: `Your fundraising campaign "${campaign.title}" could not be approved at this time.`,
          type: 'campaign',
          screen: 'campaign_details',
          dataId: String(campaign._id)
        });
      } catch (notifErr) {
        console.error('Reject notification error:', notifErr.message);
      }
    }

    const enriched = await enrichCampaign(campaign, req);
    res.json({
      status: true,
      message: 'Campaign rejected',
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

router.put('/:id/approve', handleAdminApprove);
router.post('/:id/approve', handleAdminApprove);
router.put('/:id/reject', handleAdminReject);
router.post('/:id/reject', handleAdminReject);

// Delete a campaign
router.delete('/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Campaign Reviews Endpoints & Deactivate/Activate Forwarding
const donorCampaignsRoutes = require('../donor/campaigns');
router.get('/:id/reviews', donorCampaignsRoutes.handleGetCampaignReviews);
router.post('/:id/reviews', donorCampaignsRoutes.handlePostCampaignReview);

router.put('/:id/deactivate', donorCampaignsRoutes.handleDeactivateCampaign);
router.post('/:id/deactivate', donorCampaignsRoutes.handleDeactivateCampaign);
router.patch('/:id/deactivate', donorCampaignsRoutes.handleDeactivateCampaign);

router.put('/:id/activate', donorCampaignsRoutes.handleActivateCampaign);
router.post('/:id/activate', donorCampaignsRoutes.handleActivateCampaign);
router.patch('/:id/activate', donorCampaignsRoutes.handleActivateCampaign);

module.exports = router;
