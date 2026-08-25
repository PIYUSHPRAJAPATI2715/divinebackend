const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');

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
      .populate('followingNgos', 'name organizationName logo')
      .populate('followingUsers', 'name phone profilePhoto')
      .populate('followers', 'name phone profilePhoto');
    
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

    const followersCount = (user.followers || []).length;
    const userObj = user.toObject();

    const enrichedData = {
      ...userObj,
      rating: 5.0,
      reviewCount: reviews.length,
      reviews: formattedReviews,
      followersCount,
      followers: userObj.followers || [],
      impact: userObj.impactStats || 'Active community contributor & donor.',
      impactStats: userObj.impactStats || 'Active community contributor & donor.',
      years: userObj.years || '3 Years'
    };

    res.json({
      status: true,
      data: enrichedData,
      ...enrichedData
    });
  } catch (err) {
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
      const existingPhone = await User.findOne({ phone: resolvedPhone.trim(), _id: { $ne: user._id } });
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

// Donation History Handler
const Transaction = require('../../models/Transaction');
const DanDonation = require('../../models/DanDonation');

const handleDonationHistory = async (req, res) => {
  try {
    if (!req.user || (!req.user._id && !req.user.id)) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }

    const userId = req.user._id || req.user.id;
    const dbUser = await User.findById(userId);
    const userPhone = dbUser?.phone || req.user.phone || '';
    const userEmail = dbUser?.email || req.user.email || '';
    const userName = dbUser?.name || dbUser?.organizationName || req.user.name || '';

    const txConditions = [];
    if (userPhone) {
      const cleanPhone = userPhone.replace('+91', '').trim();
      txConditions.push({ mobile: userPhone });
      txConditions.push({ mobile: cleanPhone });
      txConditions.push({ mobile: `+91 ${cleanPhone}` });
    }
    if (userName) {
      txConditions.push({ user: { $regex: new RegExp(`^${userName.trim()}$`, 'i') } });
    }

    let transactions = [];
    if (txConditions.length > 0) {
      transactions = await Transaction.find({
        type: 'Donation',
        $or: txConditions
      }).sort({ date: -1 });
    }

    const danConditions = [{ donorId: userId }];
    if (userPhone) danConditions.push({ donorPhone: userPhone });
    if (userEmail) danConditions.push({ donorEmail: userEmail });

    const danDonations = await DanDonation.find({
      $or: danConditions
    }).sort({ createdAt: -1 });

    const formattedFromTx = transactions.map(tx => ({
      _id: tx._id,
      donationId: tx.transactionId || `DON-${tx._id.toString().slice(-4)}`,
      transactionId: tx.transactionId || '',
      type: 'Donation',
      item: tx.item || tx.fundCategory || 'Divine Donation',
      fundCategory: tx.fundCategory || 'General Support',
      amount: tx.amount || 0,
      formattedAmount: `₹${(tx.amount || 0).toLocaleString('en-IN')}`,
      status: tx.status || 'Success',
      paymentMethod: tx.paymentMethod || 'UPI',
      date: tx.date || tx.createdAt,
      createdAt: tx.date || tx.createdAt
    }));

    const formattedFromDan = danDonations.map(d => ({
      _id: d._id,
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
