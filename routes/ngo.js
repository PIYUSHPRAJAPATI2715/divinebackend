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
const { buildPhoneFilter } = require('../utils/phone');
const { resolveEntityPhoto } = require('../utils/avatar');
const { syncExpiredCampaigns, calculateDaysLeft, isCampaignExpired } = require('../utils/campaignHelper');
const { getAllFollowersForEntity, formatFollowerItem } = require('../utils/followers');

// Helper to get or create NGO profile connected to logged-in User
const getOrCreateNGOProfile = async (req) => {
  if (!req.user) return null;

  // Individual donors, students, and teachers must NEVER have an NGO profile created
  if (['donor', 'student', 'teacher'].includes(req.user.role)) {
    return null;
  }

  // Try to find by phone, email, or organizationName
  const orConditions = [];
  if (req.user.email) orConditions.push({ email: req.user.email });
  if (req.user.phone) orConditions.push(buildPhoneFilter(req.user.phone));
  const orgName = (req.user.organizationName || req.user.name || '').trim();
  if (orgName && orgName !== 'Google User' && orgName !== 'Apple User') {
    orConditions.push({ name: orgName });
  }
  let ngo = orConditions.length > 0 ? await NGO.findOne({ $or: orConditions }) : null;

  if (!ngo) {
    // Only auto-create if user is registered with ngo or corporate role
    if (req.user.role !== 'ngo' && req.user.role !== 'corporate') {
      return null;
    }

    // Dynamically create an NGO record if it doesn't exist
    const name = (req.user.organizationName && req.user.organizationName.trim() !== '')
      ? req.user.organizationName
      : (req.user.name && req.user.name.trim() !== '' && req.user.name !== 'Google User' && req.user.name !== 'User')
        ? req.user.name
        : (req.user.phone || 'Divine Partner');
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

    // Compute dynamic rating from approved reviews (default to 0.0 for new entities with 0 reviews)
    let computedRating = 0.0;
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      computedRating = Math.round(avg * 10) / 10;
    }
    ngo.rating = computedRating;
    await ngo.save();

    const user = req.user ? await User.findById(req.user.id || req.user._id) : null;
    const rawFollowersList = await getAllFollowersForEntity(user || req.user);
    const followersList = rawFollowersList.map(f => formatFollowerItem(f));
    const followersCount = followersList.length;
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

    const ngoPhoto = resolveEntityPhoto(ngoObj, 'ngo');

    const isVerified = (ngoObj.status === 'Verified' || userObj.verified === true);
    const isRejected = (ngoObj.status === 'Rejected' || userObj.status === 'Rejected');

    const enrichedProfile = {
      ...userObj,
      ...ngoObj,
      _id: ngoObj._id,
      name: ngoObj.name || userObj.name || 'NGO',
      organizationName: ngoObj.name || userObj.organizationName || userObj.name || '',
      registeredAddress: ngoObj.registeredAddress || userObj.registeredAddress || '',
      status: ngoObj.status || (isVerified ? 'Verified' : (isRejected ? 'Rejected' : 'Pending')),
      verificationStatus: ngoObj.status || (isVerified ? 'Verified' : (isRejected ? 'Rejected' : 'Pending')),
      rejectionReason: ngoObj.rejectionReason || userObj.rejectionReason || '',
      rejectedAt: ngoObj.rejectedAt || null,
      resubmittedAt: ngoObj.resubmittedAt || null,
      canResubmit: isRejected,
      verified: isVerified,
      logo: ngoPhoto,
      profilePhoto: ngoPhoto,
      profileImage: ngoPhoto,
      imageUrl: ngoPhoto,
      image: ngoPhoto,
      avatar: ngoPhoto,
      photo: ngoPhoto,
      userImage: ngoPhoto,
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
      pushNotification: user ? user.pushNotification !== false : true,
      emailNotification: user ? user.emailNotification !== false : true,
      smsNotification: user ? user.smsNotification !== false : true,
      user: {
        ...userObj,
        status: ngoObj.status || (isVerified ? 'Verified' : (isRejected ? 'Rejected' : 'Pending')),
        rejectionReason: ngoObj.rejectionReason || userObj.rejectionReason || '',
        pushNotification: user ? user.pushNotification !== false : true,
        emailNotification: user ? user.emailNotification !== false : true,
        smsNotification: user ? user.smsNotification !== false : true
      }
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
      'rejectionReason', 'rejectedAt', 'resubmittedAt',
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

    if (req.body.resubmit === true || ngo.status === 'Rejected') {
      ngo.status = 'Pending';
      ngo.resubmittedAt = new Date();
      if (user) {
        user.status = 'Pending';
        user.verified = false;
      }
    }

    await ngo.save();

    if (user) {
      if (req.body.name !== undefined) user.name = req.body.name;
      if (req.body.organizationName !== undefined) user.name = req.body.organizationName;
      if (req.body.email !== undefined) user.email = req.body.email;
      if (req.body.gender !== undefined) user.gender = req.body.gender;
      if (req.body.pushNotification !== undefined) user.pushNotification = Boolean(req.body.pushNotification);
      if (req.body.emailNotification !== undefined) user.emailNotification = Boolean(req.body.emailNotification);
      if (req.body.smsNotification !== undefined) user.smsNotification = Boolean(req.body.smsNotification);
      await user.save();
    }

    const updatedUserObj = user ? user.toObject() : {};

    res.json({
      status: true,
      message: (req.body.resubmit === true || ngo.status === 'Pending')
        ? 'Profile updated and resubmitted for verification successfully!'
        : 'Organization profile updated successfully',
      ngo,
      user: updatedUserObj,
      data: {
        ...ngo.toObject(),
        ...updatedUserObj,
        canResubmit: ngo.status === 'Rejected',
        pushNotification: user ? user.pushNotification !== false : true,
        emailNotification: user ? user.emailNotification !== false : true,
        smsNotification: user ? user.smsNotification !== false : true
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Explicit Resubmit Endpoint
router.post('/resubmit', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const user = await User.findById(req.user.id || req.user._id);

    const allowedFields = [
      'name', 'legalName', 'logo', 'registrationNumber', 'contactPerson', 'registeredAddress',
      'addressCertificate', 'designation', 'email', 'phone', 'about', 'briefProfile', 'years', 'ourMission',
      'organizationType', 'isRegisteredNonProfit', 'isRegisteredCompany', 'ngoType',
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

    ngo.status = 'Pending';
    ngo.resubmittedAt = new Date();
    await ngo.save();

    if (user) {
      user.status = 'Pending';
      user.verified = false;
      await user.save();
    }

    res.json({
      status: true,
      message: 'Profile resubmitted for verification successfully. Administrator will review your updated details.',
      data: {
        ...ngo.toObject(),
        status: 'Pending',
        verificationStatus: 'Pending',
        canResubmit: false
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Get NGO Campaigns
router.get('/campaigns', async (req, res) => {
  try {
    await syncExpiredCampaigns();
    const ngo = await getOrCreateNGOProfile(req);
    const userId = req.user ? (req.user._id || req.user.id) : null;
    const query = userId ? { $or: [{ ngoId: ngo._id }, { userId }] } : { ngoId: ngo._id };
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    const enriched = campaigns.map(c => {
      const now = new Date();
      const isExpired = isCampaignExpired(c, now);
      const days = calculateDaysLeft(c, now);
      let currentStatus = c.status;
      if (isExpired && currentStatus === 'Live') {
        currentStatus = 'Completed';
      }
      const obj = c.toObject();
      const isCampaignVerified = Boolean(c.isVerified === true || currentStatus === 'Live' || currentStatus === 'Completed');
      const isCampaignActive = Boolean(c.isActive !== false && currentStatus !== 'Inactive');

      obj.activate = isCampaignActive;
      obj.active = isCampaignActive;
      obj.isActive = isCampaignActive;
      obj.is_active = isCampaignActive;
      obj.activated = isCampaignActive;

      obj.verify = isCampaignVerified;
      obj.verified = isCampaignVerified;
      obj.isVerified = isCampaignVerified;
      obj.is_verified = isCampaignVerified;
      obj.verificationStatus = currentStatus === 'Rejected' ? 'Rejected' : (isCampaignVerified ? 'Approved' : (c.verificationStatus || 'Pending'));
      obj.status = currentStatus;
      obj.isCompleted = isExpired || currentStatus === 'Completed';
      obj.isExpired = isExpired;
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

    const cleanTitle = String(title).trim();
    if (!cleanTitle) {
      return res.status(400).json({ status: false, message: 'Title cannot be empty' });
    }

    const escapedTitle = cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const titleRegex = new RegExp(`^\\s*${escapedTitle}\\s*$`, 'i');

    // 1. Check if this NGO already created a campaign with this title
    const ngoDuplicate = await Campaign.findOne({
      title: titleRegex,
      $or: [
        { ngoId: ngo._id },
        { user: ngo.name },
        { userId: req.user?._id || req.user?.id }
      ]
    });
    if (ngoDuplicate) {
      return res.status(400).json({
        status: false,
        message: `Your organization has already submitted a campaign with the title "${cleanTitle}".`
      });
    }

    // 2. Check platform-wide duplicate (active or pending review)
    const platformDuplicate = await Campaign.findOne({
      title: titleRegex,
      status: { $in: ['Live', 'Pending'] }
    });
    if (platformDuplicate) {
      return res.status(400).json({
        status: false,
        message: `A campaign with the title "${cleanTitle}" already exists or is pending approval. Please choose a distinct title.`
      });
    }

    const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : [];
    const finalCoverImage = (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') ? imageUrl.trim() : (validImages.length > 0 ? validImages[0] : '');

    if (!finalCoverImage) {
      return res.status(400).json({ status: false, message: 'Campaign image is required. Please upload or provide a cover image URL.' });
    }

    // Automatically enforce campaignId, ngo context, and pending approval status
    const campaignData = {
      ...req.body,
      title: cleanTitle,
      imageUrl: finalCoverImage,
      images: validImages.length > 0 ? validImages : [finalCoverImage],
      campaignId: `CMP-${Date.now().toString().slice(-4)}`,
      user: ngo.name,
      ngoId: ngo._id,
      userId: req.user?._id || req.user?.id || null,
      status: 'Pending',
      isActive: false,
      isVerified: false,
      verificationStatus: 'Pending'
    };
    
    const newCampaign = new Campaign(campaignData);
    const saved = await newCampaign.save();
    
    ngo.campaigns.push({
      campaignId: saved.campaignId,
      title: saved.title,
      goal: saved.goal,
      raised: saved.raised,
      status: saved.status
    });
    await ngo.save();
    
    const resp = saved.toObject();
    resp.activate = false;
    resp.active = false;
    resp.isActive = false;
    resp.verify = false;
    resp.verified = false;
    resp.isVerified = false;
    resp.verificationStatus = 'Pending';
    resp.status = 'Pending';
    
    res.status(201).json({
      status: true,
      message: 'Campaign submitted for review successfully. It will be published upon admin approval.',
      data: resp,
      ...resp
    });
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
      const existingPhone = await User.findOne({ ...buildPhoneFilter(resolvedPhone.trim()), _id: { $ne: user ? user._id : null } });
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
      rating: typeof ngoObj.rating === 'number' ? ngoObj.rating : 0.0,
      ratingValue: typeof ngoObj.rating === 'number' ? ngoObj.rating : 0.0,
      averageRating: typeof ngoObj.rating === 'number' ? ngoObj.rating : 0.0,
      reviewsCount: ngoObj.reviewsCount || 0,
      reviewCount: ngoObj.reviewsCount || 0,
      totalReviews: ngoObj.reviewsCount || 0,
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

// NGO / Organization Dashboard for Donation Tracking (Issue no. 13)
router.get('/dashboard', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const Transaction = require('../models/Transaction');

    // 1. Fetch campaigns for this NGO
    const campaigns = await Campaign.find({
      $or: [
        { ngoId: ngo._id },
        { user: ngo.name },
        { user: ngo.organizationName },
        { userPhone: ngo.phone }
      ]
    }).sort({ createdAt: -1 });

    const campaignTitles = campaigns.map(c => c.title ? c.title.trim() : '').filter(Boolean);

    // 2. Fetch campaign donations from Transaction collection
    let campaignTx = [];
    if (campaignTitles.length > 0 || ngo.name) {
      campaignTx = await Transaction.find({
        type: 'Donation',
        status: 'Success',
        $or: [
          { item: { $in: campaignTitles } },
          { fundCategory: { $in: [ngo.name, ngo.organizationName].filter(Boolean) } },
          { item: { $regex: new RegExp(`^${(ngo.name || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } }
        ]
      }).sort({ date: -1, createdAt: -1 });
    }

    // 3. Fetch direct Daan donations for this NGO
    const danDonations = await DanDonation.find({
      $or: [
        { ngoId: ngo._id },
        { ngoId: String(ngo._id) }
      ],
      paymentStatus: 'Success'
    }).sort({ createdAt: -1 });

    // Format all donations into unified list
    const formattedCampaignDonations = campaignTx.map(tx => ({
      _id: tx._id,
      donationId: tx.transactionId || `DON-${tx._id.toString().slice(-4)}`,
      donorName: tx.user || 'Anonymous Donor',
      donorPhone: tx.mobile || '',
      amount: tx.amount || 0,
      formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
      type: 'Campaign Donation',
      item: tx.item || 'Campaign',
      campaignTitle: tx.item || 'Campaign',
      status: tx.status || 'Success',
      date: tx.date || tx.createdAt,
      createdAt: tx.date || tx.createdAt
    }));

    const formattedDanDonations = danDonations.map(d => ({
      _id: d._id,
      donationId: d.donationId || `DON-${d._id.toString().slice(-4)}`,
      donorName: d.donorName || 'Anonymous Donor',
      donorPhone: d.donorPhone || '',
      donorEmail: d.donorEmail || '',
      amount: d.totalAmount || 0,
      formattedAmount: `₹${(d.totalAmount || 0).toLocaleString('en-IN')}`,
      type: 'Dan Donation',
      item: d.items && d.items.length > 0 ? d.items.map(i => i.name).join(', ') : 'Daan Seva',
      campaignTitle: d.eventName || 'Daan Seva',
      items: d.items || [],
      status: d.paymentStatus || 'Success',
      date: d.createdAt,
      createdAt: d.createdAt
    }));

    const allDonations = [...formattedCampaignDonations, ...formattedDanDonations].sort((a, b) => new Date(b.date) - new Date(a.date));

    const campaignTotal = formattedCampaignDonations.reduce((sum, d) => sum + d.amount, 0);
    const danTotal = formattedDanDonations.reduce((sum, d) => sum + d.amount, 0);
    const totalDonationsReceived = campaignTotal + danTotal;

    const uniqueDonors = new Set();
    allDonations.forEach(d => {
      const key = d.donorPhone || d.donorEmail || d.donorName;
      if (key && key !== 'Anonymous Donor') uniqueDonors.add(key);
    });
    const uniqueDonorsCount = uniqueDonors.size || allDonations.length;

    const activeCampaigns = campaigns.filter(c => c.status === 'Live');

    const campaignsSummary = campaigns.map(c => {
      const numGoal = typeof c.goal === 'number' ? c.goal : Number(String(c.goal || 0).replace(/[^0-9]/g, '')) || 0;
      const numRaised = typeof c.raised === 'number' ? c.raised : Number(String(c.raised || 0).replace(/[^0-9]/g, '')) || 0;
      const percentage = numGoal > 0 ? Math.min(100, Math.round((numRaised / numGoal) * 100)) : 0;
      return {
        _id: c._id,
        campaignId: c.campaignId,
        title: c.title,
        category: c.category,
        goal: c.goal,
        goalAmount: numGoal,
        raised: c.raised,
        raisedAmount: numRaised,
        percentage,
        donorsCount: c.donorsCount || 0,
        status: c.status,
        imageUrl: c.imageUrl
      };
    });

    const summary = {
      totalDonationsReceived,
      formattedTotalDonations: `₹${totalDonationsReceived.toLocaleString('en-IN')}`,
      totalDonationCount: allDonations.length,
      totalDonorsCount: uniqueDonorsCount,
      campaignDonationsTotal: campaignTotal,
      danDonationsTotal: danTotal,
      activeCampaignsCount: activeCampaigns.length,
      totalCampaignsCount: campaigns.length
    };

    res.json({
      status: true,
      ngo: {
        _id: ngo._id,
        id: ngo._id,
        name: ngo.name,
        organizationName: ngo.organizationName || ngo.name,
        logo: ngo.logo,
        rating: ngo.rating || 4.5,
        email: ngo.email,
        phone: ngo.phone,
        status: ngo.status
      },
      summary,
      campaigns: campaignsSummary,
      recentDonations: allDonations.slice(0, 20),
      donations: allDonations,
      data: {
        summary,
        campaigns: campaignsSummary,
        recentDonations: allDonations.slice(0, 20),
        donations: allDonations
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Donation Tracking Endpoint
router.get('/donations', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const Transaction = require('../models/Transaction');

    const campaigns = await Campaign.find({
      $or: [
        { ngoId: ngo._id },
        { user: ngo.name },
        { userPhone: ngo.phone }
      ]
    });
    const campaignTitles = campaigns.map(c => c.title ? c.title.trim() : '').filter(Boolean);

    let campaignTx = [];
    if (campaignTitles.length > 0 || ngo.name) {
      campaignTx = await Transaction.find({
        type: 'Donation',
        status: 'Success',
        $or: [
          { item: { $in: campaignTitles } },
          { fundCategory: ngo.name }
        ]
      }).sort({ date: -1, createdAt: -1 });
    }

    const danDonations = await DanDonation.find({
      $or: [{ ngoId: ngo._id }, { ngoId: String(ngo._id) }]
    }).sort({ createdAt: -1 });

    const formattedCampaignDonations = campaignTx.map(tx => ({
      _id: tx._id,
      donationId: tx.transactionId || `DON-${tx._id.toString().slice(-4)}`,
      donorName: tx.user || 'Anonymous Donor',
      donorPhone: tx.mobile || '',
      amount: tx.amount || 0,
      formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
      type: 'Campaign Donation',
      item: tx.item || 'Campaign',
      status: tx.status || 'Success',
      date: tx.date || tx.createdAt
    }));

    const formattedDanDonations = danDonations.map(d => ({
      _id: d._id,
      donationId: d.donationId || `DON-${d._id.toString().slice(-4)}`,
      donorName: d.donorName || 'Anonymous Donor',
      donorPhone: d.donorPhone || '',
      donorEmail: d.donorEmail || '',
      amount: d.totalAmount || 0,
      formattedAmount: `₹${(d.totalAmount || 0).toLocaleString('en-IN')}`,
      type: 'Dan Donation',
      item: d.items && d.items.length > 0 ? d.items.map(i => i.name).join(', ') : 'Daan',
      status: d.paymentStatus || 'Success',
      date: d.createdAt
    }));

    const all = [...formattedCampaignDonations, ...formattedDanDonations].sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = all.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      status: true,
      count: all.length,
      totalReceived: `₹${total.toLocaleString('en-IN')}`,
      totalReceivedAmount: total,
      donations: all,
      data: all
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.get('/donations/tracking', async (req, res) => {
  try {
    const ngo = await getOrCreateNGOProfile(req);
    const Transaction = require('../models/Transaction');

    const campaigns = await Campaign.find({
      $or: [
        { ngoId: ngo._id },
        { user: ngo.name },
        { userPhone: ngo.phone }
      ]
    });
    const campaignTitles = campaigns.map(c => c.title ? c.title.trim() : '').filter(Boolean);

    let campaignTx = [];
    if (campaignTitles.length > 0 || ngo.name) {
      campaignTx = await Transaction.find({
        type: 'Donation',
        status: 'Success',
        $or: [
          { item: { $in: campaignTitles } },
          { fundCategory: ngo.name }
        ]
      }).sort({ date: -1, createdAt: -1 });
    }

    const danDonations = await DanDonation.find({
      $or: [{ ngoId: ngo._id }, { ngoId: String(ngo._id) }]
    }).sort({ createdAt: -1 });

    const formattedCampaignDonations = campaignTx.map(tx => ({
      _id: tx._id,
      donationId: tx.transactionId || `DON-${tx._id.toString().slice(-4)}`,
      donorName: tx.user || 'Anonymous Donor',
      donorPhone: tx.mobile || '',
      amount: tx.amount || 0,
      formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
      type: 'Campaign Donation',
      item: tx.item || 'Campaign',
      status: tx.status || 'Success',
      date: tx.date || tx.createdAt
    }));

    const formattedDanDonations = danDonations.map(d => ({
      _id: d._id,
      donationId: d.donationId || `DON-${d._id.toString().slice(-4)}`,
      donorName: d.donorName || 'Anonymous Donor',
      donorPhone: d.donorPhone || '',
      donorEmail: d.donorEmail || '',
      amount: d.totalAmount || 0,
      formattedAmount: `₹${(d.totalAmount || 0).toLocaleString('en-IN')}`,
      type: 'Dan Donation',
      item: d.items && d.items.length > 0 ? d.items.map(i => i.name).join(', ') : 'Daan',
      status: d.paymentStatus || 'Success',
      date: d.createdAt
    }));

    const all = [...formattedCampaignDonations, ...formattedDanDonations].sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = all.reduce((sum, d) => sum + d.amount, 0);

    res.json({
      status: true,
      count: all.length,
      totalReceived: `₹${total.toLocaleString('en-IN')}`,
      totalReceivedAmount: total,
      donations: all,
      data: all
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Followers & Following endpoints for NGO portal
const { handleFollowers, handleFollowing, handleFollows } = require('./donor/social');
router.get('/followers', handleFollowers);
router.get('/following', handleFollowing);
router.get('/follows', handleFollows);

module.exports = router;
