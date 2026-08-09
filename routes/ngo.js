const express = require('express');
const router = express.Router();
const NGO = require('../models/NGO');
const Campaign = require('../models/Campaign');
const CampaignCategory = require('../models/CampaignCategory');
const User = require('../models/User');
const Review = require('../models/Review');
const DanItem = require('../models/DanItem');
const DanSubcategory = require('../models/DanSubcategory');
const DanDonation = require('../models/DanDonation');

// Helper to get or create NGO profile connected to logged-in User
const getOrCreateNGOProfile = async (req) => {
  // Try to find by phone or email
  let ngo = await NGO.findOne({
    $or: [
      { phone: req.user.phone },
      { email: req.user.email }
    ]
  });

  if (!ngo) {
    // Dynamically create an NGO record if it doesn't exist
    const name = req.user.organizationName || req.user.name || 'My NGO';
    const email = req.user.email || 'ngo@example.com';
    const phone = req.user.phone || '';
    
    ngo = new NGO({
      ngoId: `NGO-${Date.now().toString().slice(-4)}`,
      name,
      email,
      phone,
      registrationNumber: 'REG-PENDING',
      contactPerson: req.user.authorizedPerson || name,
      about: req.user.about || '',
      status: 'Verified' // Auto-verify dynamic partner signups for immediate portal usability
    });
    await ngo.save();
  }
  return ngo;
};

// 1. Get NGO Profile (enriched with reviews, followers, years, impact)
router.get('/profile', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);

    // Fetch approved reviews for NGO
    let reviews = await Review.find({
      $or: [
        { targetName: ngo.name },
        { type: 'NGO' }
      ],
      status: 'Approved'
    }).sort({ createdAt: -1 });

    if (reviews.length === 0) {
      reviews = await Review.find({ status: 'Approved' }).limit(5);
    }

    // Compute dynamic rating from approved reviews (fallback to stored rating)
    let computedRating = ngo.rating || 4.5;
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      computedRating = Math.round(avg * 10) / 10;
      // Persist updated rating
      ngo.rating = computedRating;
      await ngo.save();
    }

    const followersList = await User.find({ followingNgos: ngo._id }).select('_id name phone profilePhoto email role');
    const followersCount = followersList.length;

    const user = req.user ? await User.findById(req.user.id) : null;
    const ngoObj = ngo.toObject();
    const userObj = user ? user.toObject() : {};

    const formattedReviews = reviews.map(r => ({
      _id: r._id,
      reviewId: r.reviewId,
      userName: r.userName,
      userRole: r.userRole || 'Donor',
      type: r.type || 'NGO',
      targetName: r.targetName || ngo.name,
      rating: r.rating,
      comment: r.comment,
      videoUrl: r.videoUrl || '',
      status: r.status,
      createdAt: r.createdAt
    }));

    const enrichedProfile = {
      ...userObj,
      ...ngoObj,
      _id: ngoObj._id,
      name: ngoObj.name || userObj.name || 'NGO',
      organizationName: ngoObj.name || userObj.organizationName || userObj.name || '',
      registeredAddress: ngoObj.registeredAddress || userObj.registeredAddress || '',
      logo: ngoObj.logo || userObj.profilePhoto || null,
      profilePhoto: userObj.profilePhoto || ngoObj.logo || null,
      about: ngoObj.about || userObj.about || '',
      years: ngoObj.years || userObj.years || '5 Years',
      rating: computedRating,
      reviewCount: reviews.length,
      reviews: formattedReviews,
      followersCount: followersCount,
      followers: followersList,
      followingCount: 0,
      impact: ngoObj.impactStats || userObj.impactStats || 'Grassroots community empowerment and emergency relief.',
      impactStats: ngoObj.impactStats || userObj.impactStats || 'Grassroots community empowerment and emergency relief.',
      verified: true,
      user: userObj
    };

    res.json({
      status: true,
      ngo: enrichedProfile,
      data: enrichedProfile,
      ...enrichedProfile
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Get NGO Campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    // Find campaigns where user matches the NGO name
    const campaigns = await Campaign.find({ user: ngo.name }).sort({ createdAt: -1 });
    const enriched = campaigns.map(c => {
      let days = c.daysLeft || 30;
      if (c.endDate) {
        const diffTime = new Date(c.endDate) - new Date();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else if (c.createdAt) {
        const diffTime = (new Date(c.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) - Date.now();
        days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
      const obj = c.toObject();
      obj.daysLeft = days;
      obj.donorsCount = obj.donorsCount || 0;
      obj.imageUrl = obj.imageUrl || (obj.images && obj.images.length > 0 ? obj.images[0] : '');
      return obj;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Create NGO Campaign
router.post('/campaigns', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    
    const { imageUrl, images, title, goal } = req.body;
    if (!title || !goal) {
      return res.status(400).json({ status: false, message: 'Title and Goal amount are required' });
    }

    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    // Automatically enforce campaignId and user context (linked to NGO name)
    const campaignData = {
      ...req.body,
      imageUrl: finalCoverImage,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      user: ngo.name,
      status: 'Live' // Default to Live so it renders on home feed immediately
    };
    
    const newCampaign = new Campaign(campaignData);
    const saved = await newCampaign.save();
    
    // Increment campaigns count in NGO record
    ngo.verifiedCampaignsCount = (ngo.verifiedCampaignsCount || 0) + 1;
    ngo.campaigns.push({
      campaignId: saved.campaignId,
      title: saved.title,
      goal: saved.goal,
      raised: saved.raised,
      status: saved.status
    });
    await ngo.save();
    
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. Update NGO Campaign
router.put('/campaigns/:id', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    // Ensure the campaign belongs to this NGO before updating
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    if (campaign.user !== ngo.name) {
      return res.status(403).json({ message: 'Access denied: You do not own this campaign' });
    }
    
    const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Sync update to NGO campaigns array
    const ngoCampaignIdx = ngo.campaigns.findIndex(c => c.campaignId === updated.campaignId);
    if (ngoCampaignIdx !== -1) {
      ngo.campaigns[ngoCampaignIdx].title = updated.title;
      ngo.campaigns[ngoCampaignIdx].goal = updated.goal;
      ngo.campaigns[ngoCampaignIdx].status = updated.status;
      await ngo.save();
    }
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Submit Payout Request
router.post('/payouts', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount' });
    }
    
    const newPayout = {
      payoutId: `PO-${Date.now().toString().slice(-4)}`,
      amount: Number(amount),
      status: 'Pending',
      requestedDate: new Date()
    };
    
    ngo.payoutHistory.push(newPayout);
    await ngo.save();
    
    res.status(201).json({ status: true, payout: newPayout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5b. Update NGO Profile (including linked User details/bank accounts)
router.put('/profile', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { 
      name, 
      organizationName,
      registrationNumber, 
      contactPerson, 
      authorizedPerson,
      designation,
      about,
      email,
      gender,
      registeredAddress,
      logo,
      profilePhoto,
      years,
      ourMission,
      impact,
      impactStats,
      ngoType,
      panNumber,
      panImage,
      tanNumber,
      tanImage,
      gstNumber,
      gstDocument,
      registration12A,
      certificate12A,
      registration80G,
      certificate80G,
      darpanNumber,
      darpanCertificate,
      csr1Number,
      csr1Certificate,
      fcraNumber,
      fcraCertificate,
      bankAccountHolder,
      bankName,
      bankBranch,
      bankAccountNumber,
      bankIFSC
    } = req.body;

    const ngoName = name || organizationName;
    if (ngoName) {
      ngo.name = ngoName;
      ngo.organizationName = ngoName;
    }
    if (registrationNumber) ngo.registrationNumber = registrationNumber;
    if (contactPerson || authorizedPerson) {
      ngo.contactPerson = contactPerson || authorizedPerson;
      ngo.authorizedPerson = authorizedPerson || contactPerson;
    }
    if (designation !== undefined) ngo.designation = designation;
    if (about !== undefined) ngo.about = about;
    if (email) ngo.email = email;
    if (registeredAddress !== undefined) ngo.registeredAddress = registeredAddress;
    if (logo || profilePhoto) {
      ngo.logo = logo || profilePhoto;
    }
    if (years !== undefined) ngo.years = years;
    if (ourMission !== undefined) ngo.ourMission = ourMission;
    if (impactStats || impact) ngo.impactStats = impactStats || impact;
    if (ngoType !== undefined) ngo.ngoType = ngoType;

    if (panNumber !== undefined) ngo.panNumber = panNumber;
    if (panImage !== undefined) ngo.panImage = panImage;
    if (tanNumber !== undefined) ngo.tanNumber = tanNumber;
    if (tanImage !== undefined) ngo.tanImage = tanImage;
    if (gstNumber !== undefined) ngo.gstNumber = gstNumber;
    if (gstDocument !== undefined) ngo.gstDocument = gstDocument;
    if (registration12A !== undefined) ngo.registration12A = registration12A;
    if (certificate12A !== undefined) ngo.certificate12A = certificate12A;
    if (registration80G !== undefined) ngo.registration80G = registration80G;
    if (certificate80G !== undefined) ngo.certificate80G = certificate80G;
    if (darpanNumber !== undefined) ngo.darpanNumber = darpanNumber;
    if (darpanCertificate !== undefined) ngo.darpanCertificate = darpanCertificate;
    if (csr1Number !== undefined) ngo.csr1Number = csr1Number;
    if (csr1Certificate !== undefined) ngo.csr1Certificate = csr1Certificate;
    if (fcraNumber !== undefined) ngo.fcraNumber = fcraNumber;
    if (fcraCertificate !== undefined) ngo.fcraCertificate = fcraCertificate;

    if (bankAccountHolder !== undefined) ngo.bankAccountHolder = bankAccountHolder;
    if (bankName !== undefined) ngo.bankName = bankName;
    if (bankBranch !== undefined) ngo.bankBranch = bankBranch;
    if (bankAccountNumber !== undefined) ngo.bankAccountNumber = bankAccountNumber;
    if (bankIFSC !== undefined) ngo.bankIFSC = bankIFSC.toUpperCase();
    await ngo.save();

    // Sync user details
    const user = await User.findById(req.user.id);
    if (user) {
      if (gender) user.gender = gender;
      if (ngoName) {
        user.name = ngoName;
        user.organizationName = ngoName;
      }
      if (email) user.email = email;
      if (registeredAddress !== undefined) user.registeredAddress = registeredAddress;
      if (logo || profilePhoto) {
        user.profilePhoto = logo || profilePhoto;
        user.logo = logo || profilePhoto;
      }
      if (authorizedPerson || contactPerson) user.authorizedPerson = authorizedPerson || contactPerson;
      if (designation !== undefined) user.designation = designation;
      if (about !== undefined) user.about = about;
      if (years !== undefined) user.years = years;
      if (impactStats || impact) user.impactStats = impactStats || impact;
      await user.save();
    }

    const ngoObj = ngo.toObject();
    const userObj = user ? user.toObject() : {};

    const mergedData = {
      ...userObj,
      ...ngoObj,
      _id: ngoObj._id,
      name: ngoObj.name || userObj.name,
      organizationName: ngoObj.name || userObj.organizationName || userObj.name || '',
      registeredAddress: ngoObj.registeredAddress || userObj.registeredAddress || '',
      logo: ngoObj.logo || userObj.profilePhoto || null,
      profilePhoto: userObj.profilePhoto || ngoObj.logo || null,
      rating: ngoObj.rating || 4.5,
      impact: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
      impactStats: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
      years: ngoObj.years || '5 Years',
      user: userObj
    };

    res.json({ status: true, message: 'Profile updated successfully', ngo: mergedData, user: userObj, data: mergedData });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5c. Add NGO Relief Activity Proof (Gallery upload)
router.post('/gallery', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { title, description, imageUrl } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ message: 'Title and image URL are required' });
    }

    const newProof = {
      title,
      description: description || '',
      imageUrl,
      uploadedAt: new Date()
    };

    ngo.activityGallery.push(newProof);
    await ngo.save();

    res.status(201).json(ngo.activityGallery[ngo.activityGallery.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----------------------------------------------------
// NGO Dan Portal Routes
// ----------------------------------------------------

// List NGO's Dan items
router.get('/dan/items', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const items = await DanItem.find({ ngoId: ngo._id })
      .populate({
        path: 'subcategoryId',
        select: 'name categoryId',
        populate: { path: 'categoryId', select: 'name' }
      });
    res.json({ status: true, data: items });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create NGO's Dan item
router.post('/dan/items', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { subcategoryId, name, description, price, unit, imageUrl } = req.body;
    if (!subcategoryId || !name || price === undefined) {
      return res.status(400).json({ status: false, message: 'subcategoryId, name, and price are required' });
    }
    const subcategory = await DanSubcategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ status: false, message: 'Subcategory not found' });
    }
    const itemId = `ITM-DAN-${Date.now().toString().slice(-4)}`;
    const newItem = new DanItem({
      itemId,
      subcategoryId,
      name,
      description,
      price: Number(price),
      unit: unit || 'Unit',
      imageUrl,
      creatorType: 'NGO',
      ngoId: ngo._id
    });
    await newItem.save();
    res.status(201).json({ status: true, message: 'Dan Item created successfully', data: newItem });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Edit NGO's Dan item
router.put('/dan/items/:id', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const item = await DanItem.findOne({ _id: req.params.id, ngoId: ngo._id });
    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found or access denied' });
    }
    const updated = await DanItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: true, message: 'Item updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Delete NGO's Dan item
router.delete('/dan/items/:id', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const item = await DanItem.findOne({ _id: req.params.id, ngoId: ngo._id });
    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found or access denied' });
    }
    await DanItem.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// NGO's received donations list
router.get('/dan/donations', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const donations = await DanDonation.find({ ngoId: ngo._id })
      .populate('ngoId', 'name logo')
      .sort({ createdAt: -1 });
    res.json({ status: true, data: donations });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
