const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const User = require('../models/User');

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
 * @query   ?type=Teacher|Course|Campaign|General
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
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/reviews
 * @desc    Public/User: Submit a new review (defaults to Pending status)
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
          reviewData.userRole = dbUser.role === 'donor' ? 'Donor' : 'User';
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
