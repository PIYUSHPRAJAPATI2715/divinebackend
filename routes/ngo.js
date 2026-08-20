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

    // Fetch approved reviews specifically targeting this organization
    const reviews = await Review.find({
      targetName: ngo.name,
      status: 'Approved'
    }).sort({ createdAt: -1 });

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

// Update NGO / Corporate Profile (Supports all 25 Non-Profit & 21 Corporate fields)
router.put('/profile', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const user = await User.findById(req.user.id || req.user._id);

    const allowedFields = [
      'name', 'legalName', 'logo', 'registrationNumber', 'contactPerson', 'registeredAddress',
      'addressCertificate', 'designation', 'email', 'phone', 'about', 'briefProfile', 'years', 'ourMission',
      'organizationType', 'isRegisteredNonProfit', 'isRegisteredCompany', 'ngoType', 'status',
      'moaAoaDocs', 'panNumber', 'panImage', 'tanNumber', 'tanImage', 'gstNumber', 'gstDocument',
      'has12A', 'registration12A', 'certificate12A', 'has80G', 'registration80G', 'certificate80G',
      'hasDarpan', 'darpanNumber', 'darpanCertificate', 'hasCSR1', 'csr1Number', 'csr1Certificate',
      'hasFCRA', 'fcraNumber', 'fcraCertificate', 'websiteUrl',
      'bankAccountHolder', 'bankName', 'bankBranch', 'bankAccountNumber', 'bankIFSC', 'cancelledChequeDoc',
      'directorsKeyManagement', 'formFillerDetails', 'lastFinancialYearBudget', 'donorDatabaseStrength',
      'employeeStrength', 'hasCrowdfundedBefore', 'crowdfundingPlatformsUsed', 'campaignPlanningTimeframe',
      'purposeOfFundraising', 'csrObligation', 'csrAmountSpentPreviousYear', 'csrFocusAreas',
      'fundingPreferences', 'csrOfficerDetails', 'awardsRecognitions', 'declarations'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        ngo[field] = req.body[field];
      }
    });

    await ngo.save();

    if (user) {
      if (req.body.name !== undefined) user.name = req.body.name;
      if (req.body.organizationName !== undefined) user.name = req.body.organizationName;
      if (req.body.email !== undefined) user.email = req.body.email;
      if (req.body.gender !== undefined) user.gender = req.body.gender;
      await user.save();
    }

    res.json({
      status: true,
      message: 'Organization profile updated successfully',
      ngo,
      user
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

const saveBase64ImageNGO = (base64Str, req) => {
  if (!base64Str || typeof base64Str !== 'string') return null;
  if (!base64Str.startsWith('data:image/') && !base64Str.includes(';base64,')) {
    return base64Str;
  }
  try {
    const fs = require('fs');
    const path = require('path');
    let ext = 'png';
    let rawData = base64Str;
    const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      rawData = matches[2];
    }
    const buffer = Buffer.from(rawData, 'base64');
    const filename = `ngo_logo_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host') || 'divinebackend-v5gl.onrender.com';
    return `${protocol}://${host}/uploads/${filename}`;
  } catch (err) {
    return base64Str;
  }
};

// 5b. Update NGO Profile (including linked User details/bank accounts)
const handleUpdateNGOProfile = async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const { 
      name, organizationName,
      registrationNumber, 
      contactPerson, authorizedPerson, designation,
      about, aboutOrganization, ourMission, description,
      email, emailAddress,
      phone, phoneNumber, userPhone, mobile,
      gender,
      registeredAddress, address, officialAddress,
      logo, profilePhoto, image, avatar, photo,
      years, organizationYears,
      impact, impactStats, ngoType,
      panNumber, panImage, tanNumber, tanImage, gstNumber, gstDocument,
      registration12A, certificate12A, registration80G, certificate80G,
      darpanNumber, darpanCertificate, csr1Number, csr1Certificate, fcraNumber, fcraCertificate,
      bankAccountHolder, bankName, bankBranch, bankAccountNumber, bankIFSC
    } = req.body;

    const ngoName = name || organizationName;
    if (ngoName !== undefined && ngoName.trim() !== '') {
      ngo.name = ngoName.trim();
      ngo.organizationName = ngoName.trim();
    }
    if (registrationNumber) ngo.registrationNumber = registrationNumber;
    if (contactPerson || authorizedPerson) {
      ngo.contactPerson = contactPerson || authorizedPerson;
      ngo.authorizedPerson = authorizedPerson || contactPerson;
    }
    if (designation !== undefined) ngo.designation = designation;

    const resolvedAbout = about || aboutOrganization || ourMission || description;
    if (resolvedAbout !== undefined) {
      ngo.about = resolvedAbout;
      ngo.ourMission = resolvedAbout;
    }

    const resolvedEmail = email || emailAddress;
    if (resolvedEmail !== undefined && resolvedEmail.trim() !== '') {
      const user = req.user ? await User.findById(req.user._id || req.user.id) : null;
      const existingEmail = await User.findOne({ email: resolvedEmail.trim(), _id: { $ne: user ? user._id : null } });
      if (existingEmail) {
        return res.status(400).json({ status: false, message: 'This email address is already in use by another account.' });
      }
      ngo.email = resolvedEmail.trim();
    }

    const resolvedPhone = phone || phoneNumber || userPhone || mobile;
    if (resolvedPhone !== undefined && resolvedPhone.trim() !== '') {
      const user = req.user ? await User.findById(req.user._id || req.user.id) : null;
      const existingPhone = await User.findOne({ phone: resolvedPhone.trim(), _id: { $ne: user ? user._id : null } });
      if (existingPhone) {
        return res.status(400).json({ status: false, message: 'This phone number is already in use by another account.' });
      }
      ngo.phone = resolvedPhone.trim();
    }

    const resolvedAddress = registeredAddress || address || officialAddress;
    if (resolvedAddress !== undefined) ngo.registeredAddress = resolvedAddress;

    const rawPhoto = logo || profilePhoto || image || avatar || photo;
    if (rawPhoto) {
      const processedPhoto = saveBase64ImageNGO(rawPhoto, req);
      if (processedPhoto) {
        ngo.logo = processedPhoto;
      }
    }

    const resolvedYears = years || organizationYears;
    if (resolvedYears !== undefined) ngo.years = resolvedYears;

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
    const user = req.user ? await User.findById(req.user._id || req.user.id) : null;
    if (user) {
      if (gender) user.gender = gender;
      if (ngoName !== undefined) {
        user.name = ngoName;
        user.organizationName = ngoName;
      }
      if (resolvedEmail !== undefined) user.email = resolvedEmail;
      if (resolvedPhone !== undefined) user.phone = resolvedPhone;
      if (resolvedAddress !== undefined) user.registeredAddress = resolvedAddress;
      if (ngo.logo) {
        user.profilePhoto = ngo.logo;
        user.logo = ngo.logo;
      }
      if (authorizedPerson || contactPerson) user.authorizedPerson = authorizedPerson || contactPerson;
      if (designation !== undefined) user.designation = designation;
      if (resolvedAbout !== undefined) user.about = resolvedAbout;
      if (resolvedYears !== undefined) user.years = resolvedYears;
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
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      return res.status(400).json({ status: false, message: 'Email address or phone number already in use by another account.' });
    }
    res.status(500).json({ status: false, message: err.message });
  }
};

router.put('/profile', handleUpdateNGOProfile);
router.put('/update-profile', handleUpdateNGOProfile);
module.exports.handleUpdateNGOProfile = handleUpdateNGOProfile;

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
