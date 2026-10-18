const express = require('express');
const router = express.Router();
const Campaign = require('../../models/Campaign');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const NGO = require('../../models/NGO');
const Transaction = require('../../models/Transaction');
const { buildPhoneFilter, findUserByPhone } = require('../../utils/phone');
const { resolveEntityPhoto } = require('../../utils/avatar');

const normalizeImageUrl = (urlStr, req) => {
  if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '' || urlStr.includes('catbox.moe')) {
    return 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800';
  }
  let clean = urlStr.trim();
  if (clean.startsWith('data:image/')) {
    return saveBase64Image(clean, req) || clean;
  }
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

// Dynamic Creator Resolver Helper
const resolveCampaignCreator = async (campaign) => {
  let creatorUser = null;
  let creatorNGO = null;

  // 1. Try finding by userId / ngoId / userPhone if stored on campaign
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

  // 2. Try finding by campaign.user (if not generic fallback)
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

  // 3. Try finding by bankDetails holderName if available
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

  // 4. Fallback: Use stored campaign.user or creator models
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

// Get active campaigns
router.get('/campaigns', async (req, res) => {
  try {
    if (req.query.my === 'true' || req.query.user === 'me' || req.query.filter === 'my') {
      return handleMyCampaigns(req, res);
    }
    const { search } = req.query;
    let query = {
      status: 'Live',
      isActive: { $ne: false },
      $or: [
        { isVerified: true },
        { isVerified: { $exists: false } }
      ]
    };
    
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const regex = new RegExp(trimmedSearch, 'i');
      query.$and = [
        {
          $or: [
            { title: regex },
            { category: regex },
            { description: regex }
          ]
        }
      ];
      
      // Save to user's search history
      if (req.user && req.user._id) {
        const user = await User.findById(req.user._id);
        if (user) {
          if (!user.searchHistory) user.searchHistory = [];
          user.searchHistory = user.searchHistory.filter(t => t.toLowerCase() !== trimmedSearch.toLowerCase());
          user.searchHistory.unshift(trimmedSearch);
          if (user.searchHistory.length > 10) user.searchHistory.pop();
          await user.save();
        }
      }
    }

    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    const enriched = await Promise.all(campaigns.map(async c => {
      let days = c.daysLeft || 30;
      if (c.endDate) {
        const diffTime = new Date(c.endDate) - new Date();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else if (c.createdAt) {
        const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      const rawImages = (Array.isArray(c.images) && c.images.length > 0)
        ? c.images
        : [c.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800'];

      const normalizedImages = rawImages
        .filter(img => typeof img === 'string' && img.trim() !== '')
        .map(img => normalizeImageUrl(img, req));

      const finalImage = normalizedImages.length > 0
        ? normalizedImages[0]
        : normalizeImageUrl(c.imageUrl, req);

      const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(c);

      const obj = c.toObject();
      obj.activate = true;
      obj.active = true;
      obj.isActive = true;
      obj.is_active = true;
      obj.activated = true;
      obj.verify = true;
      obj.verified = true;
      obj.isVerified = true;
      obj.is_verified = true;
      obj.verificationStatus = 'Approved';
      obj.daysLeft = days;
      obj.donorsCount = obj.donorsCount || 0;
      obj.imageUrl = finalImage;
      obj.images = normalizedImages;
      obj.user = creatorName;
      obj.userName = creatorName;
      obj.user_name = creatorName;
      obj.creatorName = creatorName;
      obj.creator_name = creatorName;
      obj.fundraiserName = creatorName;
      obj.fundraiser_name = creatorName;
      obj.fundraiser = creatorName;
      obj.userImage = creatorPhoto;
      obj.user_image = creatorPhoto;
      obj.userLogo = creatorPhoto;
      obj.profilePhoto = creatorPhoto;
      obj.creatorImage = creatorPhoto;
      obj.creatorPhoto = creatorPhoto;
      obj.fundraiserImage = creatorPhoto;
      obj.fundraiser_image = creatorPhoto;
      obj.fundraiserLogo = creatorPhoto;
      obj.fundraiserPhoto = creatorPhoto;
      obj.userProfile = creatorProfile;
      obj.creatorProfile = creatorProfile;
      obj.fundraiserProfile = creatorProfile;
      return obj;
    }));

    res.json({ status: true, data: enriched });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Get single campaign
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const isOwner = userId && (
      (campaign.userId && campaign.userId.toString() === userId.toString()) ||
      (req.user && req.user.role === 'admin')
    );
    if ((campaign.isActive === false || campaign.status === 'Inactive') && !isOwner) {
      return res.status(404).json({ status: false, message: 'Campaign is inactive or unavailable' });
    }
    if ((campaign.status === 'Pending' || campaign.isVerified === false) && !isOwner) {
      return res.status(404).json({ status: false, message: 'Campaign is pending verification and not yet published' });
    }

    // Fetch recent successful transactions for this campaign
    const recentTransactions = await Transaction.find({
      type: 'Donation',
      item: campaign.title,
      status: 'Success'
    })
    .sort({ date: -1 })
    .limit(10);

    const recentDonors = await Promise.all(recentTransactions.map(async tx => {
      const donorUser = await User.findOne({
        $or: [
          { name: tx.user },
          { phone: tx.mobile },
          { phone: tx.mobile ? tx.mobile.replace('+91', '').trim() : '' }
        ]
      });
      const photo = resolveEntityPhoto(donorUser, 'user');
      return {
        name: tx.user || 'Anonymous Donor',
        amount: tx.amount,
        date: tx.date,
        profilePhoto: photo,
        userImage: photo,
        donorImage: photo,
        image: photo
      };
    }));

    // Attach to campaign object safely to prevent frontend breaking changes
    const campaignObj = campaign.toObject();

    const isCampaignVerified = Boolean(campaign.isVerified === true || campaign.status === 'Live' || campaign.status === 'Completed');
    const isCampaignActive = Boolean(campaign.isActive !== false && campaign.status !== 'Inactive');

    campaignObj.activate = isCampaignActive;
    campaignObj.active = isCampaignActive;
    campaignObj.isActive = isCampaignActive;
    campaignObj.is_active = isCampaignActive;
    campaignObj.activated = isCampaignActive;

    campaignObj.verify = isCampaignVerified;
    campaignObj.verified = isCampaignVerified;
    campaignObj.isVerified = isCampaignVerified;
    campaignObj.is_verified = isCampaignVerified;
    campaignObj.verificationStatus = campaign.status === 'Rejected' 
      ? 'Rejected' 
      : (isCampaignVerified ? 'Approved' : (campaign.verificationStatus || 'Pending'));

    // Look up creator dynamic profile info
    const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(campaign);

    let days = campaignObj.daysLeft || 30;
    if (campaignObj.endDate) {
      const diffTime = new Date(campaignObj.endDate) - new Date();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else if (campaignObj.createdAt) {
      const diffTime = (new Date(campaignObj.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const rawImages = (Array.isArray(campaignObj.images) && campaignObj.images.length > 0)
      ? campaignObj.images
      : [campaignObj.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800'];

    const normalizedImages = rawImages
      .filter(img => typeof img === 'string' && img.trim() !== '')
      .map(img => normalizeImageUrl(img, req));

    const finalImage = normalizedImages.length > 0
      ? normalizedImages[0]
      : normalizeImageUrl(campaignObj.imageUrl, req);

    campaignObj.imageUrl = finalImage;
    campaignObj.images = normalizedImages;

    campaignObj.user = creatorName;
    campaignObj.userName = creatorName;
    campaignObj.user_name = creatorName;
    campaignObj.creatorName = creatorName;
    campaignObj.creator_name = creatorName;
    campaignObj.fundraiserName = creatorName;
    campaignObj.fundraiser_name = creatorName;
    campaignObj.fundraiser = creatorName;
    campaignObj.userImage = creatorPhoto;
    campaignObj.user_image = creatorPhoto;
    campaignObj.userLogo = creatorPhoto;
    campaignObj.profilePhoto = creatorPhoto;
    campaignObj.creatorImage = creatorPhoto;
    campaignObj.creatorPhoto = creatorPhoto;
    campaignObj.fundraiserImage = creatorPhoto;
    campaignObj.fundraiser_image = creatorPhoto;
    campaignObj.fundraiserLogo = creatorPhoto;
    campaignObj.fundraiserPhoto = creatorPhoto;
    campaignObj.userProfile = creatorProfile;
    campaignObj.creatorProfile = creatorProfile;
    campaignObj.fundraiserProfile = creatorProfile;
    campaignObj.daysLeft = days;
    campaignObj.donorsCount = campaignObj.donorsCount || 0;
    campaignObj.imageUrl = finalImage;
    campaignObj.recentDonors = recentDonors;
    campaignObj.recent_donors = recentDonors;
    campaignObj.donorsList = recentDonors;
    campaignObj.donors_list = recentDonors;
    campaignObj.donors = recentDonors;
    campaignObj.recentDonations = recentDonors;
    campaignObj.recent_donations = recentDonors;

    res.json({
      status: true,
      data: campaignObj,
      recentDonors: recentDonors,
      recent_donors: recentDonors,
      donorsList: recentDonors,
      donors: recentDonors,
      recentDonations: recentDonors
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// My Campaigns API (Campaigns created by the authenticated logged-in user or NGO)
const handleMyCampaigns = async (req, res) => {
  try {
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.json({
        status: true,
        count: 0,
        totalCampaigns: 0,
        totalRaised: '₹0',
        totalRaisedAmount: 0,
        totalGetAmount: 0,
        totalReceivedAmount: 0,
        totalGoal: '₹0',
        totalGoalAmount: 0,
        totalTargetAmount: 0,
        totalDonorsCount: 0,
        myCampaigns: [],
        campaigns: [],
        data: []
      });
    }

    const userId = req.user._id || req.user.id;
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.json({
        status: true,
        count: 0,
        totalCampaigns: 0,
        totalRaised: '₹0',
        totalRaisedAmount: 0,
        totalGetAmount: 0,
        totalReceivedAmount: 0,
        totalGoal: '₹0',
        totalGoalAmount: 0,
        totalTargetAmount: 0,
        totalDonorsCount: 0,
        myCampaigns: [],
        campaigns: [],
        data: []
      });
    }

    // Query strictly for campaigns where userId equals the authenticated user's _id
    const queryConditions = [{ userId: dbUser._id }];
    if (dbUser.ngoId) {
      queryConditions.push({ ngoId: dbUser.ngoId });
    } else if (dbUser.role === 'ngo') {
      const cleanPhone = (dbUser.phone || '').trim();
      const cleanEmail = (dbUser.email || '').trim().toLowerCase();
      const ngoOr = [];
      if (cleanPhone && cleanPhone.length > 5) ngoOr.push({ phone: cleanPhone });
      if (cleanEmail && cleanEmail.length > 3 && !cleanEmail.endsWith('@example.com')) ngoOr.push({ email: cleanEmail });
      if (ngoOr.length > 0) {
        const dbNGO = await NGO.findOne({ $or: ngoOr });
        if (dbNGO) {
          queryConditions.push({ ngoId: dbNGO._id });
        }
      }
    }

    let query = { $or: queryConditions };

    if (req.query.status && req.query.status.trim() !== '' && req.query.status !== 'All') {
      const targetStatus = req.query.status.trim();
      query = { $and: [query, { status: { $regex: new RegExp(`^${targetStatus}$`, 'i') } }] };
    }

    const myCampaigns = await Campaign.find(query).sort({ createdAt: -1 });

    let totalRaisedNum = 0;
    let totalGoalNum = 0;
    let totalDonors = 0;

    const enriched = await Promise.all(myCampaigns.map(async c => {
      let days = c.daysLeft || 30;
      if (c.endDate) {
        const diffTime = new Date(c.endDate) - new Date();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else if (c.createdAt) {
        const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(c);

      const rawRaised = String(c.raised || '0').replace(/[^0-9.]/g, '');
      const rawGoal = String(c.goal || '0').replace(/[^0-9.]/g, '');
      const raisedNum = parseFloat(rawRaised) || 0;
      const goalNum = parseFloat(rawGoal) || 0;
      const donorsCountNum = Number(c.donorsCount || 0);

      totalRaisedNum += raisedNum;
      totalGoalNum += goalNum;
      totalDonors += donorsCountNum;

      const obj = c.toObject();
      obj.daysLeft = days;
      obj.donorsCount = donorsCountNum;

      const isCampaignVerified = Boolean(c.isVerified === true || c.status === 'Live' || c.status === 'Completed');
      const isCampaignActive = Boolean(c.isActive !== false && c.status !== 'Inactive');

      obj.activate = isCampaignActive;
      obj.active = isCampaignActive;
      obj.isActive = isCampaignActive;
      obj.is_active = isCampaignActive;
      obj.activated = isCampaignActive;

      obj.verify = isCampaignVerified;
      obj.verified = isCampaignVerified;
      obj.isVerified = isCampaignVerified;
      obj.is_verified = isCampaignVerified;
      obj.verificationStatus = c.status === 'Rejected' 
        ? 'Rejected' 
        : (isCampaignVerified ? 'Approved' : (c.verificationStatus || 'Pending'));
      obj.status = c.status;

      obj.raised = c.raised || `₹${raisedNum.toLocaleString('en-IN')}`;
      obj.raisedAmount = raisedNum;
      obj.getAmount = raisedNum;
      obj.totalGetAmount = raisedNum;
      obj.amountRaised = raisedNum;

      obj.goal = c.goal || `₹${goalNum.toLocaleString('en-IN')}`;
      obj.goalAmount = goalNum;
      obj.targetAmount = goalNum;

      obj.user = creatorName;
      obj.userName = creatorName;
      obj.user_name = creatorName;
      obj.creatorName = creatorName;
      obj.creator_name = creatorName;
      obj.fundraiserName = creatorName;
      obj.fundraiser_name = creatorName;
      obj.fundraiser = creatorName;
      obj.userImage = creatorPhoto;
      obj.user_image = creatorPhoto;
      obj.userLogo = creatorPhoto;
      obj.profilePhoto = creatorPhoto;
      obj.creatorImage = creatorPhoto;
      obj.creatorPhoto = creatorPhoto;
      obj.fundraiserImage = creatorPhoto;
      obj.fundraiser_image = creatorPhoto;
      obj.fundraiserLogo = creatorPhoto;
      obj.fundraiserPhoto = creatorPhoto;
      obj.userProfile = creatorProfile;
      obj.creatorProfile = creatorProfile;
      obj.fundraiserProfile = creatorProfile;
      return obj;
    }));

    res.json({
      status: true,
      count: enriched.length,
      totalRaised: `₹${totalRaisedNum.toLocaleString('en-IN')}`,
      totalRaisedAmount: totalRaisedNum,
      totalGetAmount: totalRaisedNum,
      totalReceivedAmount: totalRaisedNum,
      totalGoal: `₹${totalGoalNum.toLocaleString('en-IN')}`,
      totalGoalAmount: totalGoalNum,
      totalTargetAmount: totalGoalNum,
      totalDonorsCount: totalDonors,
      myCampaigns: enriched,
      campaigns: enriched,
      data: enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

router.get('/campaigns/my', handleMyCampaigns);
router.get('/my-campaigns', handleMyCampaigns);

// Raise campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { title, category, description, goal, imageUrl, oneTimeOrMonthly, endDate, images, video, documents, bankDetails } = req.body;
    if (!title || !goal) {
      return res.status(400).json({ status: false, message: 'Title and Goal amount are required' });
    }
    
    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    const dbUser = await User.findById(req.user.id || req.user._id);
    const creatorName = (dbUser && dbUser.name && dbUser.name.trim() !== '') 
      ? dbUser.name 
      : (dbUser && dbUser.organizationName && dbUser.organizationName.trim() !== '') 
        ? dbUser.organizationName 
        : (req.body.user && req.body.user.trim() !== '' ? req.body.user : (dbUser?.phone || 'Divine User'));

    const ngo = await NGO.findOne({ $or: [{ phone: dbUser?.phone }, { email: dbUser?.email }] });

    const newCampaign = new Campaign({
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      title,
      user: creatorName,
      userId: dbUser ? dbUser._id : null,
      ngoId: ngo ? ngo._id : null,
      userPhone: dbUser ? dbUser.phone : '',
      category: category || 'General Support',
      description: description || '',
      imageUrl: finalCoverImage,
      goal: `₹${Number(goal).toLocaleString()}`,
      raised: '₹0',
      oneTimeOrMonthly: oneTimeOrMonthly || 'One-Time',
      status: 'Pending',
      isActive: true,
      isVerified: false,
      verificationStatus: 'Pending',
      donorsCount: 0,
      endDate: endDate || null,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      video: video || null,
      documents: documents || [],
      bankDetails: bankDetails || null
    });
    
    await newCampaign.save();
    
    try {
      const { createAndSendNotification } = require('../../utils/notification');
      await createAndSendNotification({
        userId: req.user._id || req.user.id,
        title: 'Campaign Submitted for Review! 📝',
        body: `Your fundraising campaign "${title}" has been submitted for review. It will go live once verified and approved by admin.`,
        type: 'campaign',
        screen: 'campaign_details',
        dataId: String(newCampaign._id)
      });
    } catch (notifErr) {
      console.error('Campaign creation notification error:', notifErr.message);
    }
    
    const campObj = newCampaign.toObject();
    campObj.activate = true;
    campObj.active = true;
    campObj.isActive = true;
    campObj.is_active = true;
    campObj.activated = true;
    campObj.verify = false;
    campObj.verified = false;
    campObj.isVerified = false;
    campObj.is_verified = false;
    campObj.verificationStatus = 'Pending';

    res.status(201).json({ 
      status: true, 
      message: 'Campaign submitted for review successfully. It will be published upon admin approval.', 
      data: campObj,
      campaign: campObj,
      ...campObj
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Deactivate campaign handler (Owner only, keeps in my-campaigns with isActive: false, hides from other users)
const handleDeactivateCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id || req.body.campaignId || req.body.id;
    if (!campaignId) {
      return res.status(400).json({ status: false, message: 'Campaign ID is required' });
    }

    let campaign = await Campaign.findById(campaignId).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }

    const dbUser = await User.findById(userId);
    let dbNGO = null;
    if (dbUser) {
      dbNGO = await NGO.findOne({
        $or: [
          { phone: dbUser.phone },
          { email: dbUser.email }
        ]
      });
    }

    const isOwner = (
      (campaign.userId && campaign.userId.toString() === userId.toString()) ||
      (campaign.userPhone && dbUser && campaign.userPhone === dbUser.phone) ||
      (dbNGO && campaign.ngoId && campaign.ngoId.toString() === dbNGO._id.toString()) ||
      (dbUser && dbUser.role === 'admin')
    );

    if (!isOwner) {
      return res.status(403).json({
        status: false,
        message: 'Access denied: You can only deactivate your own campaign'
      });
    }

    campaign.isActive = false;
    if (campaign.status === 'Live') {
      campaign.previousStatus = campaign.status;
      campaign.status = 'Inactive';
    }
    await campaign.save();

    const isCampaignVerified = Boolean(campaign.isVerified === true || campaign.status === 'Live' || campaign.previousStatus === 'Live');

    const campObj = campaign.toObject();
    const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(campObj);

    campObj.activate = false;
    campObj.active = false;
    campObj.isActive = false;
    campObj.is_active = false;
    campObj.activated = false;
    campObj.verify = isCampaignVerified;
    campObj.verified = isCampaignVerified;
    campObj.isVerified = isCampaignVerified;
    campObj.is_verified = isCampaignVerified;
    campObj.verificationStatus = campaign.status === 'Rejected' ? 'Rejected' : (isCampaignVerified ? 'Approved' : (campaign.verificationStatus || 'Pending'));
    campObj.user = creatorName;
    campObj.userName = creatorName;
    campObj.userImage = creatorPhoto;
    campObj.profilePhoto = creatorPhoto;
    campObj.userProfile = creatorProfile;

    res.json({
      status: true,
      message: 'Campaign deactivated successfully. It will no longer be visible to other users, but remains in your campaign list.',
      activate: false,
      active: false,
      isActive: false,
      verify: isCampaignVerified,
      isVerified: isCampaignVerified,
      data: campObj,
      campaign: campObj,
      ...campObj
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Activate campaign handler
const handleActivateCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id || req.body.campaignId || req.body.id;
    if (!campaignId) {
      return res.status(400).json({ status: false, message: 'Campaign ID is required' });
    }

    let campaign = await Campaign.findById(campaignId).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }

    const dbUser = await User.findById(userId);
    let dbNGO = null;
    if (dbUser) {
      dbNGO = await NGO.findOne({
        $or: [
          { phone: dbUser.phone },
          { email: dbUser.email }
        ]
      });
    }

    const isOwner = (
      (campaign.userId && campaign.userId.toString() === userId.toString()) ||
      (campaign.userPhone && dbUser && campaign.userPhone === dbUser.phone) ||
      (dbNGO && campaign.ngoId && campaign.ngoId.toString() === dbNGO._id.toString()) ||
      (dbUser && dbUser.role === 'admin')
    );

    if (!isOwner) {
      return res.status(403).json({
        status: false,
        message: 'Access denied: You can only activate your own campaign'
      });
    }

    campaign.isActive = true;
    if (campaign.status === 'Inactive') {
      campaign.status = (campaign.isVerified || campaign.previousStatus === 'Live') ? 'Live' : 'Pending';
    }
    await campaign.save();

    const isCampaignVerified = Boolean(campaign.isVerified === true || campaign.status === 'Live');

    const campObj = campaign.toObject();
    const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(campObj);

    campObj.activate = true;
    campObj.active = true;
    campObj.isActive = true;
    campObj.is_active = true;
    campObj.activated = true;
    campObj.verify = isCampaignVerified;
    campObj.verified = isCampaignVerified;
    campObj.isVerified = isCampaignVerified;
    campObj.is_verified = isCampaignVerified;
    campObj.verificationStatus = campaign.status === 'Rejected' ? 'Rejected' : (isCampaignVerified ? 'Approved' : (campaign.verificationStatus || 'Pending'));
    campObj.user = creatorName;
    campObj.userName = creatorName;
    campObj.userImage = creatorPhoto;
    campObj.profilePhoto = creatorPhoto;
    campObj.userProfile = creatorProfile;

    res.json({
      status: true,
      message: 'Campaign activated successfully.',
      activate: true,
      active: true,
      isActive: true,
      verify: isCampaignVerified,
      isVerified: isCampaignVerified,
      data: campObj,
      campaign: campObj,
      ...campObj
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Update campaign route handler
const handleUpdateCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;
    let campaign = await Campaign.findById(campaignId).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const dbUser = userId ? await User.findById(userId) : null;

    if (dbUser && campaign.userId && campaign.userId.toString() !== dbUser._id.toString()) {
      if (dbUser.role !== 'admin') {
        return res.status(403).json({ status: false, message: 'Access denied: You are not authorized to update this campaign' });
      }
    }

    const {
      title, category, description, goal, imageUrl, oneTimeOrMonthly,
      endDate, images, video, documents, bankDetails, status
    } = req.body;

    if (title !== undefined) campaign.title = title;
    if (category !== undefined) campaign.category = category;
    if (description !== undefined) campaign.description = description;
    if (goal !== undefined) {
      const numGoal = typeof goal === 'number' ? goal : Number(String(goal).replace(/[^0-9]/g, ''));
      if (!isNaN(numGoal) && numGoal > 0) {
        campaign.goal = `₹${numGoal.toLocaleString('en-IN')}`;
      } else {
        campaign.goal = String(goal);
      }
    }
    if (oneTimeOrMonthly !== undefined) campaign.oneTimeOrMonthly = oneTimeOrMonthly;
    if (endDate !== undefined) campaign.endDate = endDate;
    if (status !== undefined) campaign.status = status;
    if (video !== undefined) campaign.video = video;
    if (documents !== undefined) campaign.documents = documents;
    if (bankDetails !== undefined) campaign.bankDetails = bankDetails;

    if (req.body.activate !== undefined || req.body.isActive !== undefined || req.body.active !== undefined) {
      const activeVal = Boolean(req.body.activate ?? req.body.isActive ?? req.body.active);
      campaign.isActive = activeVal;
      if (!activeVal && campaign.status === 'Live') {
        campaign.previousStatus = campaign.status;
        campaign.status = 'Inactive';
      } else if (activeVal && campaign.status === 'Inactive') {
        campaign.status = (campaign.isVerified || campaign.previousStatus === 'Live') ? 'Live' : 'Pending';
      }
    }

    if (req.body.isVerified !== undefined || req.body.verify !== undefined) {
      if (dbUser && dbUser.role === 'admin') {
        campaign.isVerified = Boolean(req.body.isVerified ?? req.body.verify);
        campaign.verificationStatus = campaign.isVerified ? 'Approved' : 'Pending';
      }
    }

    let validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
      campaign.imageUrl = imageUrl.trim();
      if (validImages.length === 0) validImages.push(imageUrl.trim());
    }
    if (validImages.length > 0) {
      campaign.images = validImages;
      if (!campaign.imageUrl) campaign.imageUrl = validImages[0];
    }

    await campaign.save();

    const campaignObj = campaign.toObject();
    const rawImages = (Array.isArray(campaignObj.images) && campaignObj.images.length > 0)
      ? campaignObj.images
      : [campaignObj.imageUrl || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=800'];

    const normalizedImages = rawImages
      .filter(img => typeof img === 'string' && img.trim() !== '')
      .map(img => normalizeImageUrl(img, req));

    const finalImage = normalizedImages.length > 0
      ? normalizedImages[0]
      : normalizeImageUrl(campaignObj.imageUrl, req);

    const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(campaignObj);

    let days = campaignObj.daysLeft || 30;
    if (campaignObj.endDate) {
      const diffTime = new Date(campaignObj.endDate) - new Date();
      days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const isCampaignVerified = Boolean(campaign.isVerified === true || campaign.status === 'Live' || campaign.status === 'Completed');
    const isCampaignActive = Boolean(campaign.isActive !== false && campaign.status !== 'Inactive');

    campaignObj.activate = isCampaignActive;
    campaignObj.active = isCampaignActive;
    campaignObj.isActive = isCampaignActive;
    campaignObj.is_active = isCampaignActive;
    campaignObj.activated = isCampaignActive;

    campaignObj.verify = isCampaignVerified;
    campaignObj.verified = isCampaignVerified;
    campaignObj.isVerified = isCampaignVerified;
    campaignObj.is_verified = isCampaignVerified;
    campaignObj.verificationStatus = campaign.status === 'Rejected' 
      ? 'Rejected' 
      : (isCampaignVerified ? 'Approved' : (campaign.verificationStatus || 'Pending'));

    campaignObj.imageUrl = finalImage;
    campaignObj.images = normalizedImages;
    campaignObj.user = creatorName;
    campaignObj.userName = creatorName;
    campaignObj.creatorName = creatorName;
    campaignObj.fundraiserName = creatorName;
    campaignObj.userImage = creatorPhoto;
    campaignObj.userProfile = creatorProfile;
    campaignObj.daysLeft = days;

    res.json({
      status: true,
      message: 'Campaign updated successfully',
      data: campaignObj,
      ...campaignObj
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};

// Get reviews for a specific campaign
const handleGetCampaignReviews = async (req, res) => {
  try {
    const campaignId = req.params.id;
    let campaign = await Campaign.findById(campaignId).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId });
    }

    const targetName = campaign ? campaign.title : campaignId;
    const Review = require('../../models/Review');

    const queryFilter = {
      type: 'Campaign',
      status: 'Approved'
    };

    if (campaign) {
      queryFilter.$or = [
        { campaignId: campaign._id },
        { targetName: { $regex: new RegExp(`^${campaign.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ];
    } else {
      queryFilter.targetName = { $regex: new RegExp(`^${campaignId.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }

    const reviews = await Review.find(queryFilter).sort({ createdAt: -1 });

    const total = reviews.length;
    let averageRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (total > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        distribution[star] = (distribution[star] || 0) + 1;
        return acc + r.rating;
      }, 0);
      averageRating = Math.round((sum / total) * 10) / 10;
    }

    res.json({
      status: true,
      campaignId: campaign ? campaign._id : campaignId,
      campaignTitle: campaign ? campaign.title : targetName,
      averageRating,
      totalReviews: total,
      ratingDistribution: distribution,
      reviews,
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Post a review for a specific campaign
const handlePostCampaignReview = async (req, res) => {
  try {
    const campaignId = req.params.id;
    let campaign = await Campaign.findById(campaignId).catch(() => null);
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId });
    }
    if (!campaign) {
      return res.status(404).json({ status: false, message: 'Campaign not found' });
    }

    const { rating, comment, videoUrl, video, userName, userRole } = req.body;
    if (!rating || (!comment && !videoUrl && !video)) {
      return res.status(400).json({ status: false, message: 'Rating (1-5) and comment or video are required' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ status: false, message: 'Rating must be a number between 1 and 5' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const dbUser = userId ? await User.findById(userId) : null;

    const finalUserName = dbUser ? (dbUser.name || dbUser.organizationName || 'Verified User') : (userName || 'Anonymous Supporter');
    const finalUserRole = dbUser ? (dbUser.role === 'donor' ? 'Donor' : dbUser.role === 'student' ? 'Student' : 'User') : (userRole || 'User');

    const Review = require('../../models/Review');
    const newReview = new Review({
      reviewId: `REV-${Date.now().toString().slice(-6)}`,
      userName: finalUserName,
      userRole: finalUserRole,
      type: 'Campaign',
      targetName: campaign.title,
      campaignId: campaign._id,
      campaign: campaign.title,
      userId: dbUser ? dbUser._id : null,
      rating: numRating,
      comment: comment || 'Great campaign!',
      videoUrl: videoUrl || video || '',
      status: 'Approved'
    });

    const savedReview = await newReview.save();

    const allCampaignReviews = await Review.find({
      $or: [
        { campaignId: campaign._id },
        { targetName: { $regex: new RegExp(`^${campaign.title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
      ],
      type: 'Campaign',
      status: 'Approved'
    });

    const count = allCampaignReviews.length;
    let avg = 0;
    if (count > 0) {
      avg = Math.round((allCampaignReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;
    }

    campaign.rating = avg;
    campaign.reviewsCount = count;
    await campaign.save();

    res.status(201).json({
      status: true,
      message: 'Review submitted successfully for campaign',
      campaignRating: avg,
      campaignReviewsCount: count,
      data: savedReview,
      review: savedReview
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
};

router.put('/campaigns/:id', handleUpdateCampaign);
router.put('/campaigns/update/:id', handleUpdateCampaign);
router.put('/campaigns/edit/:id', handleUpdateCampaign);

router.put('/campaigns/:id/deactivate', handleDeactivateCampaign);
router.post('/campaigns/:id/deactivate', handleDeactivateCampaign);
router.patch('/campaigns/:id/deactivate', handleDeactivateCampaign);
router.put('/campaigns/deactivate/:id', handleDeactivateCampaign);
router.post('/campaigns/deactivate/:id', handleDeactivateCampaign);

router.put('/campaigns/:id/activate', handleActivateCampaign);
router.post('/campaigns/:id/activate', handleActivateCampaign);
router.patch('/campaigns/:id/activate', handleActivateCampaign);
router.put('/campaigns/activate/:id', handleActivateCampaign);
router.post('/campaigns/activate/:id', handleActivateCampaign);

router.put('/:id/deactivate', handleDeactivateCampaign);
router.post('/:id/deactivate', handleDeactivateCampaign);
router.put('/:id/activate', handleActivateCampaign);
router.post('/:id/activate', handleActivateCampaign);

router.get('/campaigns/:id/reviews', handleGetCampaignReviews);
router.get('/:id/reviews', handleGetCampaignReviews);

router.post('/campaigns/:id/reviews', handlePostCampaignReview);
router.post('/:id/reviews', handlePostCampaignReview);

router.handleMyCampaigns = handleMyCampaigns;
router.handleUpdateCampaign = handleUpdateCampaign;
router.handleDeactivateCampaign = handleDeactivateCampaign;
router.handleActivateCampaign = handleActivateCampaign;
router.handleGetCampaignReviews = handleGetCampaignReviews;
router.handlePostCampaignReview = handlePostCampaignReview;

module.exports = router;
module.exports.handleMyCampaigns = handleMyCampaigns;
module.exports.handleUpdateCampaign = handleUpdateCampaign;
module.exports.handleDeactivateCampaign = handleDeactivateCampaign;
module.exports.handleActivateCampaign = handleActivateCampaign;
module.exports.handleGetCampaignReviews = handleGetCampaignReviews;
module.exports.handlePostCampaignReview = handlePostCampaignReview;
