const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const User = require('../models/User');
const NGO = require('../models/NGO');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

// Optional auth helper to check if logged-in user is submitting
const optionalAuth = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      console.log('Lenient review auth failed:', err.message);
    }
  }
  next();
};

/**
 * @route   GET /api/reviews
 * @desc    Public: Get approved reviews with optional filters
 * @access  Public
 * @query   ?type=Teacher|Course|Campaign|General|NGO
 *          &targetName=SpecificName
 *          &rating=5
 */
router.get('/', async (req, res) => {
  try {
    const { type, targetName, rating } = req.query;
    // Always filter for Approved reviews only for public display
    const filter = { status: 'Approved' };

    if (type) filter.type = type;
    if (targetName) filter.targetName = { $regex: targetName, $options: 'i' };
    if (rating) filter.rating = Number(rating);

    const reviews = await Review.find(filter).sort({ createdAt: -1 });

    res.json({
      status: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/reviews/ngo/:ngoId
 * @desc    Get approved reviews for a specific NGO by ngoId or name.
 *          Also returns the computed rating and review count.
 * @access  Public
 */
router.get('/ngo/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Try to find NGO by ngoId first, then by name
    const ngo = await NGO.findOne({
      $or: [
        { ngoId: identifier },
        { name: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      ]
    });

    if (!ngo) {
      return res.status(404).json({ status: false, message: 'NGO not found' });
    }

    const reviews = await Review.find({
      targetName: { $regex: new RegExp(`^${ngo.name}$`, 'i') },
      type: 'NGO',
      status: 'Approved'
    }).sort({ createdAt: -1 });

    // Compute average rating
    let averageRating = ngo.rating || 0;
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + r.rating, 0);
      averageRating = Math.round((total / reviews.length) * 10) / 10;
    }

    res.json({
      status: true,
      ngoId: ngo.ngoId,
      ngoName: ngo.name,
      rating: averageRating,
      reviewCount: reviews.length,
      data: reviews.map(r => ({
        reviewId: r.reviewId,
        userName: r.userName,
        userRole: r.userRole,
        rating: r.rating,
        comment: r.comment,
        videoUrl: r.videoUrl || '',
        createdAt: r.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/reviews
 * @desc    Public/User: Submit a new review (defaults to Pending status)
 *          NOTE: Admin must approve from admin panel for review to appear publicly.
 * @access  Public / Optional Auth
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    if (req.body.type) {
      const typeLower = req.body.type.trim().toLowerCase();
      if (typeLower === 'ngo') req.body.type = 'NGO';
      else if (typeLower === 'teacher') req.body.type = 'Teacher';
      else if (typeLower === 'course') req.body.type = 'Course';
      else if (typeLower === 'campaign') req.body.type = 'Campaign';
      else if (typeLower === 'general') req.body.type = 'General';
    }
    const reviewId = `REV-${Date.now().toString().slice(-6)}`;
    const reviewData = { ...req.body, reviewId, status: 'Pending' };

    // If logged-in, pre-fill or enforce user role/name if not provided
    if (req.user && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser) {
        if (!reviewData.userName) {
          reviewData.userName = dbUser.name || dbUser.organizationName || 'User';
        }
        if (!reviewData.userRole) {
          reviewData.userRole = dbUser.role === 'donor' ? 'Donor' : dbUser.role === 'student' ? 'Student' : 'User';
        }
      }
    }

    if (!reviewData.userName || !reviewData.type || !reviewData.targetName || !reviewData.rating || !reviewData.comment) {
      return res.status(400).json({
        status: false,
        message: 'userName, type, targetName, rating, and comment are required fields.'
      });
    }

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    // If type is NGO, update the NGO rating live (recompute from all approved reviews)
    if (savedReview.type === 'NGO') {
      try {
        const ngo = await NGO.findOne({
          name: { $regex: new RegExp(`^${savedReview.targetName}$`, 'i') }
        });
        if (ngo) {
          const approvedReviews = await Review.find({
            targetName: { $regex: new RegExp(`^${ngo.name}$`, 'i') },
            type: 'NGO',
            status: 'Approved'
          });
          if (approvedReviews.length > 0) {
            const avg = approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length;
            ngo.rating = Math.round(avg * 10) / 10;
            await ngo.save();
          }
        }
      } catch (ratingErr) {
        console.warn('Could not update NGO rating after review:', ratingErr.message);
      }
    }

    res.status(201).json({
      status: true,
      message: 'Review submitted successfully. It will be visible once approved by admin.',
      data: savedReview
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
