const router = require('express').Router();
const Campaign = require('../../models/Campaign');
const NGO = require('../../models/NGO');
const User = require('../../models/User');

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
    creatorUser = await User.findOne({ phone: campaign.userPhone });
    creatorNGO = await NGO.findOne({ phone: campaign.userPhone });
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

  if (!creatorUser && !creatorNGO) {
    creatorNGO = await NGO.findOne({ status: 'Verified' });
    if (!creatorNGO) creatorUser = await User.findOne({ role: 'ngo' }) || await User.findOne();
  }

  const name = (campaign.user && campaign.user !== 'Divine Donor' && campaign.user !== 'Divine Owner' && campaign.user.trim() !== '') 
    ? campaign.user 
    : (creatorNGO?.name || creatorNGO?.organizationName || creatorUser?.name || creatorUser?.organizationName || 'Divine Organizer');

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

const enrichCampaign = async (campaignDoc) => {
  const c = campaignDoc.toObject ? campaignDoc.toObject() : campaignDoc;
  const { name: creatorName, photo: creatorPhoto, profileObj: creatorProfile } = await resolveCampaignCreator(c);

  let days = c.daysLeft || 30;
  if (c.endDate) {
    const diffTime = new Date(c.endDate) - new Date();
    days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  } else if (c.createdAt) {
    const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
    days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return {
    ...c,
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
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    const enriched = await Promise.all(campaigns.map(enrichCampaign));
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

    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    const newCampaign = new Campaign({
      ...req.body,
      imageUrl: finalCoverImage,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      campaignId: `CMP-${Date.now().toString().slice(-4)}`
    });
    const savedCampaign = await newCampaign.save();
    const enriched = await enrichCampaign(savedCampaign);
    res.status(201).json({ status: true, message: 'Campaign created successfully', data: enriched, ...enriched });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Update a campaign
router.put('/:id', async (req, res) => {
  try {
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true }
    );
    if (!updatedCampaign) return res.status(404).json({ message: 'Campaign not found' });
    const enriched = await enrichCampaign(updatedCampaign);
    res.json(enriched);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a campaign
router.delete('/:id', async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
