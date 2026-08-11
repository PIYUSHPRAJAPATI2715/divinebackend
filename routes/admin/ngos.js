const express = require('express');
const router = express.Router();
const NGO = require('../../models/NGO');
const User = require('../../models/User');
const Review = require('../../models/Review');

// Helper to enrich NGO object with reviews, impact, followersCount, years, rating
const enrichNGOData = async (ngo) => {
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

  let computedRating = ngo.rating || 4.5;
  if (reviews.length > 0) {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    computedRating = Math.round(avg * 10) / 10;
  }

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

  let userPhone = ngoObj.phone || '';
  if (!userPhone) {
    const userDoc = await User.findOne({
      $or: [
        { email: ngoObj.email },
        { name: ngoObj.name }
      ]
    }).select('phone');
    if (userDoc && userDoc.phone) {
      userPhone = userDoc.phone;
    }
  }

  return {
    ...ngoObj,
    phone: userPhone || ngoObj.phone || '',
    mobileNumber: userPhone || ngoObj.phone || '',
    userPhone: userPhone || ngoObj.phone || '',
    rating: computedRating,
    reviewCount: reviews.length,
    reviews: formattedReviews,
    followersCount: followersCount,
    followers: followersList,
    followingCount: 0,
    impact: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
    impactStats: ngoObj.impactStats || 'Grassroots community empowerment and emergency relief.',
    years: ngoObj.years || '5 Years',
    verified: ngoObj.status === 'Verified' || true
  };
};

// Get all NGOs
router.get('/', async (req, res) => {
  try {
    const ngos = await NGO.find().sort({ createdAt: -1 });
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
    res.json({ status: true, message: 'NGO deleted' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
