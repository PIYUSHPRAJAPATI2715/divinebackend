const express = require('express');
const router = express.Router();
const Campaign = require('../../models/Campaign');
const Notification = require('../../models/Notification');
const User = require('../../models/User');
const NGO = require('../../models/NGO');
const Transaction = require('../../models/Transaction');

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
    creatorUser = await User.findOne({ phone: campaign.userPhone });
    creatorNGO = await NGO.findOne({ phone: campaign.userPhone });
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

  // 4. Fallback if campaign was created under a legacy placeholder name
  if (!creatorUser && !creatorNGO) {
    creatorNGO = await NGO.findOne({ status: 'Verified' });
    if (!creatorNGO) creatorUser = await User.findOne({ role: 'ngo' }) || await User.findOne();
  }

  const name = creatorNGO?.name || creatorNGO?.organizationName || creatorUser?.name || creatorUser?.organizationName || 'Divine Organizer';
  const photo = creatorNGO?.logo || creatorUser?.profilePhoto || creatorUser?.logo || 'https://files.catbox.moe/q4i0t0.jpg';
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
    const { search } = req.query;
    let query = { status: 'Live' };
    
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const regex = new RegExp(trimmedSearch, 'i');
      query.$or = [
        { title: regex },
        { category: regex },
        { description: regex }
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
      let finalImage = '';
      if (Array.isArray(c.images)) {
        const uploadedImg = c.images.find(img => typeof img === 'string' && img.trim() !== '' && !img.includes('unsplash.com'));
        if (uploadedImg) finalImage = uploadedImg;
      }
      if (!finalImage && c.imageUrl && typeof c.imageUrl === 'string' && c.imageUrl.trim() !== '' && !c.imageUrl.includes('unsplash.com')) {
        finalImage = c.imageUrl.trim();
      }
      if (!finalImage && Array.isArray(c.images)) {
        const anyImg = c.images.find(img => typeof img === 'string' && img.trim() !== '');
        if (anyImg) finalImage = anyImg.trim();
      }
      if (!finalImage) {
        finalImage = (c.imageUrl && typeof c.imageUrl === 'string') ? c.imageUrl.trim() : '';
      }

      const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(c);

      const obj = c.toObject();
      obj.daysLeft = days;
      obj.donorsCount = obj.donorsCount || 0;
      obj.imageUrl = finalImage;
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
      const photo = donorUser?.profilePhoto || donorUser?.logo || 'https://files.catbox.moe/q4i0t0.jpg';
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

    let finalImage = '';
    if (Array.isArray(campaignObj.images)) {
      const uploadedImg = campaignObj.images.find(img => typeof img === 'string' && img.trim() !== '' && !img.includes('unsplash.com'));
      if (uploadedImg) finalImage = uploadedImg;
    }
    if (!finalImage && campaignObj.imageUrl && typeof campaignObj.imageUrl === 'string' && campaignObj.imageUrl.trim() !== '' && !campaignObj.imageUrl.includes('unsplash.com')) {
      finalImage = campaignObj.imageUrl.trim();
    }
    if (!finalImage && Array.isArray(campaignObj.images)) {
      const anyImg = campaignObj.images.find(img => typeof img === 'string' && img.trim() !== '');
      if (anyImg) finalImage = anyImg.trim();
    }
    if (!finalImage) {
      finalImage = (campaignObj.imageUrl && typeof campaignObj.imageUrl === 'string') ? campaignObj.imageUrl.trim() : '';
    }

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
    let dbUser = null;
    if (req.user && (req.user._id || req.user.id)) {
      dbUser = await User.findById(req.user._id || req.user.id);
    }
    const dbNGO = dbUser ? await NGO.findOne({
      $or: [
        { phone: dbUser?.phone },
        { email: dbUser?.email }
      ]
    }) : null;

    const userPhone = dbUser?.phone || '';
    const userId = dbUser?._id;
    const ngoId = dbNGO?._id;
    const userName = dbUser?.name || dbNGO?.name || '';

    const queryConditions = [];
    if (userId) queryConditions.push({ userId });
    if (ngoId) queryConditions.push({ ngoId });
    if (userPhone) queryConditions.push({ userPhone });
    if (userName) queryConditions.push({ user: { $regex: new RegExp(`^${userName.trim()}$`, 'i') } });

    let query = queryConditions.length > 0 ? { $or: queryConditions } : { userId: req.user?._id };
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
      status: 'Live',
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
        title: 'Campaign Created Successfully! 📢',
        body: `Your fundraising campaign "${title}" has been created and is now live!`,
        type: 'campaign',
        screen: 'campaign_details',
        dataId: String(newCampaign._id)
      });
    } catch (notifErr) {
      console.error('Campaign creation notification error:', notifErr.message);
    }
    
    res.status(201).json({ status: true, message: 'Campaign raised successfully', data: newCampaign });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

router.handleMyCampaigns = handleMyCampaigns;

module.exports = router;
module.exports.handleMyCampaigns = handleMyCampaigns;
