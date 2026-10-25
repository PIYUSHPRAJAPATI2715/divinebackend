const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const { buildPhoneFilter } = require('../../utils/phone');
const { resolveEntityPhoto, enrichEntityPhotos } = require('../../utils/avatar');
const { calculateNgoDynamicRating } = require('../../utils/rating');
const { getAllFollowersForEntity, formatFollowerItem } = require('../../utils/followers');

// Utility to generate unique referral code
const generateReferralCode = (name) => {
  const prefix = name ? name.slice(0, 4).toUpperCase() : 'DIVINE';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randNum}`;
};

// Get profile
router.get('/profile', async (req, res) => {
  try {
    let user = await User.findById(req.user._id)
      .populate('followingNgos', 'name organizationName logo contactPerson phone registeredAddress rating verifiedCampaignsCount')
      .populate('followingUsers', 'name phone profilePhoto email role logo')
      .populate('followers', 'name phone profilePhoto email role logo');
    
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name);
      await user.save();
    }

    const Review = require('../../models/Review');

    // Fetch approved reviews for or by this donor
    const reviews = await Review.find({
      $or: [
        { userName: user.name },
        { targetName: { $regex: new RegExp(`^${user.name}$`, 'i') } }
      ],
      status: 'Approved'
    }).sort({ createdAt: -1 });

    const formattedReviews = reviews.map(r => ({
      reviewId: r.reviewId,
      userName: r.userName,
      userRole: r.userRole,
      rating: r.rating,
      comment: r.comment,
      videoUrl: r.videoUrl || '',
      createdAt: r.createdAt
    }));

    const rawFollowers = await getAllFollowersForEntity(user);
    const followersCount = rawFollowers.length;
    const computedRating = reviews.length > 0 
      ? (Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10) 
      : 0.0;

    const userObj = user.toObject();

    const name = user.name || 'Donor';
    const email = user.email || '';
    const phone = user.phone || '';
    const userPhoto = resolveEntityPhoto(user, user.role === 'ngo' ? 'ngo' : 'user');

    const formattedFollowingNgos = await Promise.all((userObj.followingNgos || []).filter(Boolean).map(async (n) => {
      const dynamicRating = await calculateNgoDynamicRating(n);
      const photos = enrichEntityPhotos(n, 'ngo');
      return {
        ...n,
        rating: dynamicRating.rating,
        ratingValue: dynamicRating.rating,
        averageRating: dynamicRating.rating,
        reviewsCount: dynamicRating.reviewsCount,
        reviewCount: dynamicRating.reviewsCount,
        totalReviews: dynamicRating.reviewsCount,
        ...photos
      };
    }));

    const formattedFollowingUsers = (userObj.followingUsers || []).filter(Boolean).map(u => {
      const photos = enrichEntityPhotos(u, 'user');
      return {
        ...u,
        ...photos
      };
    });

    const formattedFollowers = rawFollowers.map(f => formatFollowerItem(f));

    const enrichedData = {
      ...userObj,
      _id: user._id,
      id: user._id,
      name,
      email,
      phone,
      role: user.role || 'donor',
      profilePhoto: userPhoto,
      logo: userPhoto,
      avatar: userPhoto,
      image: userPhoto,
      imageUrl: userPhoto,
      rating: computedRating,
      reviewCount: reviews.length,
      reviews: formattedReviews,
      followersCount,
      followers: formattedFollowers,
      followingNgos: formattedFollowingNgos,
      followingUsers: formattedFollowingUsers,
      following: [...formattedFollowingNgos, ...formattedFollowingUsers],
      impact: userObj.impactStats || 'Active community contributor & donor.',
      impactStats: userObj.impactStats || 'Active community contributor & donor.',
      years: userObj.years || '3 Years',
      pushNotification: user.pushNotification !== false,
      emailNotification: user.emailNotification !== false,
      smsNotification: user.smsNotification !== false,
      user: {
        ...userObj,
        profilePhoto: userPhoto,
        logo: userPhoto,
        avatar: userPhoto,
        image: userPhoto,
        imageUrl: userPhoto,
        followingNgos: formattedFollowingNgos,
        followingUsers: formattedFollowingUsers,
        followers: formattedFollowers
      }
    };

    res.json({
      status: true,
      data: enrichedData,
      donor: enrichedData,
      user: enrichedData.user,
      ...enrichedData
    });
  } catch (err) {
    console.error('[DONOR PROFILE ERROR]', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

// Helper to save base64 image strings to physical upload files
const saveBase64Image = (base64Str, req) => {
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
    const filename = `avatar_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../../uploads');
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

// Update donor profile handler
const handleUpdateDonorProfile = async (req, res) => {
  try {
    const { 
      name, fullName, userName, organizationName,
      email, emailAddress,
      phone, phoneNumber, userPhone, mobile,
      gender,
      profilePhoto, logo, image, avatar, photo, profile_photo,
      registeredAddress, address, officialAddress,
      years, organizationYears,
      about, aboutOrganization, ourMission, description, impactStats
    } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const resolvedName = name || fullName || userName || organizationName;
    if (resolvedName !== undefined && resolvedName.trim() !== '') {
      user.name = resolvedName.trim();
      user.organizationName = resolvedName.trim();
    }

    const resolvedEmail = email || emailAddress;
    if (resolvedEmail !== undefined && resolvedEmail.trim() !== '') {
      const existingEmail = await User.findOne({ email: resolvedEmail.trim(), _id: { $ne: user._id } });
      if (existingEmail) {
        return res.status(400).json({ status: false, message: 'This email address is already in use by another account.' });
      }
      user.email = resolvedEmail.trim();
    }

    const resolvedPhone = phone || phoneNumber || userPhone || mobile;
    if (resolvedPhone !== undefined && resolvedPhone.trim() !== '') {
      const existingPhone = await User.findOne({ ...buildPhoneFilter(resolvedPhone.trim()), _id: { $ne: user._id } });
      if (existingPhone) {
        return res.status(400).json({ status: false, message: 'This phone number is already in use by another account.' });
      }
      user.phone = resolvedPhone.trim();
    }

    if (gender !== undefined && gender.trim() !== '') {
      user.gender = gender.trim();
    }

    const rawPhoto = profilePhoto || logo || image || avatar || photo || profile_photo;
    if (rawPhoto) {
      const processedPhoto = saveBase64Image(rawPhoto, req);
      if (processedPhoto) {
        user.profilePhoto = processedPhoto;
        user.logo = processedPhoto;
      }
    }

    const resolvedAddress = registeredAddress || address || officialAddress;
    if (resolvedAddress !== undefined) user.registeredAddress = resolvedAddress;

    const resolvedYears = years || organizationYears;
    if (resolvedYears !== undefined) user.years = resolvedYears;

    const resolvedAbout = about || aboutOrganization || ourMission || description;
    if (resolvedAbout !== undefined) user.about = resolvedAbout;

    if (user.name && user.email) {
      user.isProfileComplete = true;
    }

    if (req.body.pushNotification !== undefined) user.pushNotification = Boolean(req.body.pushNotification);
    if (req.body.emailNotification !== undefined) user.emailNotification = Boolean(req.body.emailNotification);
    if (req.body.smsNotification !== undefined) user.smsNotification = Boolean(req.body.smsNotification);

    await user.save();

    // If linked NGO user, update NGO collection item as well
    const NGO = require('../../models/NGO');
    let ngo = await NGO.findOne({ $or: [{ email: user.email }, { phone: user.phone }] });
    if (ngo) {
      if (resolvedName !== undefined) ngo.name = resolvedName;
      if (resolvedName !== undefined) ngo.organizationName = resolvedName;
      if (user.email) ngo.email = user.email;
      if (user.phone) ngo.phone = user.phone;
      if (user.profilePhoto) ngo.logo = user.profilePhoto;
      if (resolvedAddress !== undefined) ngo.registeredAddress = resolvedAddress;
      if (resolvedYears !== undefined) ngo.years = resolvedYears;
      if (resolvedAbout !== undefined) ngo.about = resolvedAbout;
      await ngo.save();
    }

    const notification = new Notification({
      user: user._id,
      title: 'Profile Updated',
      message: 'Your profile details have been successfully updated!'
    });
    await notification.save();

    const userObj = user.toObject();
    res.json({
      status: true,
      message: 'Profile updated successfully',
      data: userObj,
      user: userObj,
      ngo: ngo ? ngo.toObject() : null
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      return res.status(400).json({ status: false, message: 'Email address or phone number already in use by another account.' });
    }
    res.status(400).json({ status: false, message: err.message });
  }
};

router.put('/profile', handleUpdateDonorProfile);
router.put('/update-profile', handleUpdateDonorProfile);
module.exports.handleUpdateDonorProfile = handleUpdateDonorProfile;

// Deactivate account
router.post('/deactivate', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    
    const { deletePermanently } = req.body;
    
    if (deletePermanently) {
      await User.findByIdAndDelete(req.user._id);
      return res.json({ status: true, message: 'Account permanently deleted' });
    } else {
      user.isProfileComplete = false;
      await user.save();
      return res.json({ status: true, message: 'Account successfully deactivated' });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Donation History Handler (DONATIONS ONLY - excludes wallet recharges, top-ups, and non-donation transactions)
const Transaction = require('../../models/Transaction');
const DanDonation = require('../../models/DanDonation');

const isTopupOrRecharge = (itemStr, fundCategoryStr, typeStr) => {
  const combined = `${itemStr || ''} ${fundCategoryStr || ''} ${typeStr || ''}`.toLowerCase();
  return (
    combined.includes('wallet') ||
    combined.includes('top-up') ||
    combined.includes('topup') ||
    combined.includes('recharge') ||
    combined.includes('cashback') ||
    combined.includes('refund') ||
    combined.includes('admin adjustment')
  );
};

const handleDonationHistory = async (req, res) => {
  try {
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }

    const userId = req.user._id || req.user.id;
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.json({
        status: true,
        count: 0,
        totalDonated: '₹0',
        totalDonatedAmount: 0,
        donations: [],
        donationHistory: [],
        myDonations: [],
        myDonationHistory: [],
        userDonationHistory: [],
        history: [],
        data: []
      });
    }

    const userName = (dbUser.name || dbUser.organizationName || req.user.name || '').trim();
    const userPhoto = dbUser.profilePhoto || dbUser.logo || 'https://files.catbox.moe/q4i0t0.jpg';
    const displayName = userName || 'You';

    // Strictly scope transactions to this user's unique _id (never match unverified phones or other users' records)
    const transactions = await Transaction.find({
      type: 'Donation',
      userId: dbUser._id,
      status: 'Success'
    })
    .sort({ date: -1, createdAt: -1, _id: -1 })
    .lean();

    // Strictly scope Dan donations to this user's unique _id
    const danDonations = await DanDonation.find({
      donorId: dbUser._id,
      paymentStatus: 'Success'
    })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

    const formattedFromTx = transactions
      .filter(tx => !isTopupOrRecharge(tx.item, tx.fundCategory, tx.type))
      .map(tx => ({
        _id: tx._id,
        id: tx._id,
        donationId: tx.transactionId || `DON-${tx._id.toString().slice(-4)}`,
        transactionId: tx.transactionId || '',
        type: 'Donation',
        item: tx.item || tx.fundCategory || 'Divine Donation',
        fundCategory: tx.fundCategory || 'General Support',
        amount: tx.amount || 0,
        formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
        status: tx.status || 'Success',
        paymentMethod: tx.paymentMethod || 'UPI',
        user: tx.user || displayName,
        userName: tx.user || displayName,
        user_name: tx.user || displayName,
        donor: tx.user || displayName,
        donorName: tx.user || displayName,
        donor_name: tx.user || displayName,
        donatedBy: tx.user || displayName,
        donated_by: tx.user || displayName,
        name: tx.user || displayName,
        image: userPhoto,
        donorImage: userPhoto,
        userImage: userPhoto,
        profilePhoto: userPhoto,
        date: tx.date || tx.createdAt,
        createdAt: tx.date || tx.createdAt
      }));

    const formattedFromDan = danDonations.map(d => ({
      _id: d._id,
      id: d._id,
      donationId: d.donationId || `DON-${d._id.toString().slice(-4)}`,
      transactionId: d.transactionId || '',
      type: 'Dan Donation',
      item: d.items && d.items.length > 0 ? d.items.map(i => i.name).join(', ') : 'Dan Donation',
      fundCategory: d.eventType || 'Daan',
      amount: d.totalAmount || 0,
      formattedAmount: `₹${(d.totalAmount || 0).toLocaleString('en-IN')}`,
      status: d.paymentStatus || 'Success',
      paymentMethod: d.paymentMethod || 'UPI',
      items: d.items || [],
      user: d.donorName || displayName,
      userName: d.donorName || displayName,
      user_name: d.donorName || displayName,
      donor: d.donorName || displayName,
      donorName: d.donorName || displayName,
      donor_name: d.donorName || displayName,
      donatedBy: d.donorName || displayName,
      donated_by: d.donorName || displayName,
      name: d.donorName || displayName,
      image: userPhoto,
      donorImage: userPhoto,
      userImage: userPhoto,
      profilePhoto: userPhoto,
      date: d.createdAt,
      createdAt: d.createdAt
    }));

    const combined = [...formattedFromTx, ...formattedFromDan].sort((a, b) => new Date(b.date) - new Date(a.date));
    const totalDonatedAmount = combined.reduce((sum, item) => sum + (item.amount || 0), 0);

    res.json({
      status: true,
      count: combined.length,
      totalDonated: `₹${totalDonatedAmount.toLocaleString('en-IN')}`,
      totalDonatedAmount,
      donations: combined,
      donationHistory: combined,
      myDonations: combined,
      myDonationHistory: combined,
      userDonationHistory: combined,
      history: combined,
      data: combined
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

router.get('/donation-history', handleDonationHistory);
router.get('/donations', handleDonationHistory);
router.get('/history', handleDonationHistory);

router.handleDonationHistory = handleDonationHistory;
module.exports = router;
module.exports.handleDonationHistory = handleDonationHistory;
