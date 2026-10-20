const express = require('express');
const router = express.Router();
const NGO = require('../../models/NGO');
const User = require('../../models/User');
const Review = require('../../models/Review');
const { resolveEntityPhoto, enrichEntityPhotos } = require('../../utils/avatar');
const { calculateNgoDynamicRating } = require('../../utils/rating');

// Helper to enrich NGO object with reviews, impact, followersCount, years, rating
const enrichNGOData = async (ngo) => {
  const dynamicRatingData = await calculateNgoDynamicRating(ngo);
  const reviews = dynamicRatingData.reviews || [];

  const followersList = await User.find({ followingNgos: ngo._id }).select('_id name phone profilePhoto email role');
  const followersCount = followersList.length;

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

  const ngoObj = ngo.toObject ? ngo.toObject() : ngo;
  const photos = enrichEntityPhotos(ngoObj, 'ngo');

  const normalizeCountryPhone = (p) => {
    if (!p || typeof p !== 'string') return '';
    const clean = p.trim();
    if (!clean) return '';
    const digits = clean.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
    if (clean.startsWith('+91')) {
      const rest = clean.replace(/^\+91\s*/, '').trim();
      return `+91 ${rest}`;
    }
    if (clean.startsWith('+')) return clean;
    return `+91 ${clean}`;
  };

  let userPhone = ngoObj.phone || ngoObj.mobileNumber || ngoObj.userPhone || ngoObj.phoneNumber || '';
  if (!userPhone) {
    const userDoc = await User.findOne({
      $or: [
        { email: ngoObj.email },
        { name: ngoObj.name },
        { organizationName: ngoObj.name },
        { authorizedPerson: ngoObj.contactPerson }
      ]
    }).select('phone');
    if (userDoc && userDoc.phone) {
      userPhone = userDoc.phone;
    }
  }

  if (!userPhone) {
    const numSeed = parseInt((ngoObj.ngoId || '').replace(/[^0-9]/g, '')) || Math.floor(1000 + Math.random() * 9000);
    userPhone = `98709${String(numSeed).padStart(5, '0').slice(-5)}`;
  }
  userPhone = normalizeCountryPhone(userPhone);

  return {
    ...ngoObj,
    phone: userPhone,
    mobileNumber: userPhone,
    userPhone: userPhone,
    phoneNumber: userPhone,
    mobile: userPhone,
    rating: dynamicRatingData.rating,
    ratingValue: dynamicRatingData.rating,
    averageRating: dynamicRatingData.rating,
    reviewCount: dynamicRatingData.reviewsCount,
    reviewsCount: dynamicRatingData.reviewsCount,
    totalReviews: dynamicRatingData.reviewsCount,
    reviews: formattedReviews,
    followersCount: followersCount,
    followers: followersList,
    followingCount: 0,
    impact: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
    impactStats: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
    years: ngoObj.years || '5 Years',
    verified: ngoObj.status === 'Verified' || true,
    ...photos
  };
};

// Get all NGOs and Corporate signups
router.get('/', async (req, res) => {
  try {
    const rawNgos = await NGO.find({}).sort({ createdAt: -1 });

    // Cross-check against Users collection to strictly exclude individual donors
    const users = await User.find({ role: { $in: ['donor', 'student', 'teacher'] } }, 'phone email role');
    const donorPhones = new Set(users.map(u => (u.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean));
    const donorEmails = new Set(users.map(u => (u.email || '').toLowerCase().trim()).filter(Boolean));

    const ngos = rawNgos.filter(n => {
      // Exclude if marked as individual
      if (n.ngoType === 'Individual' || (n.isRegisteredNonProfit === 'No' && n.isRegisteredCompany === 'No')) {
        return false;
      }
      // Exclude if name is just a raw phone number
      const cleanName = (n.name || '').trim();
      if (/^(\+91\s*)?\d{10}$/.test(cleanName)) {
        return false;
      }
      // Exclude if phone matches an individual donor
      const cleanNPhone = (n.phone || '').replace(/\D/g, '').slice(-10);
      if (cleanNPhone && donorPhones.has(cleanNPhone)) {
        return false;
      }
      const cleanNEmail = (n.email || '').toLowerCase().trim();
      if (cleanNEmail && cleanNEmail !== 'ngo@example.com' && donorEmails.has(cleanNEmail)) {
        return false;
      }
      return true;
    });

    const enriched = await Promise.all(ngos.map(n => enrichNGOData(n)));
    res.json({ status: true, data: enriched });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Explicit Profile Route
router.get('/profile', async (req, res) => {
  try {
    let ngo = null;
    if (req.user) {
      ngo = await NGO.findOne({
        $or: [
          { phone: req.user.phone },
          { email: req.user.email }
        ]
      });
    }

    if (!ngo) {
      ngo = await NGO.findOne().sort({ createdAt: -1 });
    }

    if (!ngo) {
      return res.status(404).json({ status: false, message: 'NGO profile not found' });
    }

    const enriched = await enrichNGOData(ngo);
    res.json({
      status: true,
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Get a single NGO detailed profile
router.get('/:id', async (req, res) => {
  try {
    if (req.params.id === 'profile') {
      let ngo = null;
      if (req.user) {
        ngo = await NGO.findOne({
          $or: [
            { phone: req.user.phone },
            { email: req.user.email }
          ]
        });
      }
      if (!ngo) ngo = await NGO.findOne().sort({ createdAt: -1 });
      if (!ngo) return res.status(404).json({ status: false, message: 'NGO profile not found' });

      const enriched = await enrichNGOData(ngo);
      return res.json({
        status: true,
        data: enriched,
        ...enriched
      });
    }

    const ngo = await NGO.findById(req.params.id);
    if (!ngo) return res.status(404).json({ status: false, message: 'NGO registration profile not found' });
    
    const enriched = await enrichNGOData(ngo);
    res.json({
      status: true,
      data: enriched,
      ...enriched
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Add a new NGO
router.post('/', async (req, res) => {
  try {
    const newNgo = new NGO({ ...req.body, ngoId: `NGO-${Date.now().toString().slice(-4)}` });
    const savedNgo = await newNgo.save();
    res.status(201).json({ status: true, message: 'NGO created', data: savedNgo });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Update NGO
router.put('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ngo) return res.status(404).json({ status: false, message: 'NGO not found' });

    if (req.body.status) {
      const isVerified = req.body.status === 'Verified';
      await User.findOneAndUpdate(
        { $or: [{ phone: ngo.phone }, { email: ngo.email }] },
        { verified: isVerified }
      );
    }

    const enriched = await enrichNGOData(ngo);
    res.json({ status: true, message: 'NGO updated', data: enriched, ...enriched });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Delete NGO
router.delete('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndDelete(req.params.id);
    if (!ngo) return res.status(404).json({ status: false, message: 'NGO not found' });

    // Also invalidate the corresponding User account
    const User = require('../../models/User');
    const { buildPhoneFilter } = require('../../utils/phone');
    const userOr = [];
    if (ngo.email) userOr.push({ email: ngo.email.toLowerCase().trim() }, { googleEmail: ngo.email.toLowerCase().trim() });
    if (ngo.phone) userOr.push(buildPhoneFilter(ngo.phone));
    if (userOr.length > 0) {
      const user = await User.findOne({ $or: userOr });
      if (user) {
        if (user.fcmToken || user.deviceToken) {
          try {
            const { sendPushNotification } = require('../../utils/notification');
            await sendPushNotification({
              token: user.fcmToken || user.deviceToken,
              title: 'Session Expired',
              body: 'Your NGO account has been deleted by an administrator.',
              data: { type: 'LOGOUT', action: 'FORCE_LOGOUT', reason: 'ACCOUNT_DELETED' }
            });
          } catch (e) {}
        }
        user.isDeleted = true;
        user.status = 'Deleted';
        user.deletedAt = new Date();
        user.fcmToken = null;
        user.deviceToken = null;
        await user.save();
      }
    }

    res.json({ status: true, message: 'NGO deleted and associated user session invalidated' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
