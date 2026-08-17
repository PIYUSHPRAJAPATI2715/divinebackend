const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Campaign = require('../models/Campaign');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const path = require('path');
const fs = require('fs');

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

// Save Base64 file upload (Video or Image)
const saveBase64Media = (base64Str, req, defaultPrefix = 'review') => {
  if (!base64Str || typeof base64Str !== 'string') return '';
  if (!base64Str.startsWith('data:') && !base64Str.includes(';base64,')) {
    return base64Str;
  }
  try {
    let ext = 'mp4';
    let rawData = base64Str;
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('video/mp4')) ext = 'mp4';
      else if (mime.includes('video/webm')) ext = 'webm';
      else if (mime.includes('video/quicktime')) ext = 'mov';
      else if (mime.includes('image/jpeg')) ext = 'jpg';
      else if (mime.includes('image/png')) ext = 'png';
      else if (mime.includes('image/webp')) ext = 'webp';
      rawData = matches[2];
    }
    const buffer = Buffer.from(rawData, 'base64');
    const filename = `${defaultPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    const protocol = (req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https')) ? 'https' : 'http';
    const host = (req && req.get) ? req.get('host') : 'divinebackend-v5gl.onrender.com';
    return `${protocol}://${host}/uploads/${filename}`;
  } catch (err) {
    return base64Str;
  }
};

// Recompute average rating and review count on target document
const recalculateTargetRating = async (targetType, targetName) => {
  if (!targetType || !targetName) return;
  try {
    const approvedReviews = await Review.find({
      targetName: { $regex: new RegExp(`^${targetName}$`, 'i') },
      type: targetType,
      status: 'Approved'
    });

    const count = approvedReviews.length;
    let avgRating = 0;
    if (count > 0) {
      const sum = approvedReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      avgRating = Math.round((sum / count) * 10) / 10;
    }

    if (targetType === 'NGO') {
      await NGO.updateOne(
        { name: { $regex: new RegExp(`^${targetName}$`, 'i') } },
        { $set: { rating: avgRating, reviewsCount: count } }
      );
    } else if (targetType === 'Campaign') {
      await Campaign.updateOne(
        { title: { $regex: new RegExp(`^${targetName}$`, 'i') } },
        { $set: { rating: avgRating, reviewsCount: count } }
      );
    } else if (targetType === 'Teacher') {
      await Teacher.updateOne(
        { name: { $regex: new RegExp(`^${targetName}$`, 'i') } },
        { $set: { rating: avgRating, reviewsCount: count } }
      );
    } else if (targetType === 'Course') {
      await Course.updateOne(
        { title: { $regex: new RegExp(`^${targetName}$`, 'i') } },
        { $set: { rating: avgRating, reviewsCount: count } }
      );
    }
  } catch (err) {
    console.warn('Error recalculating target rating:', err.message);
  }
};

/**
 * @route   GET /api/reviews
 * @desc    Public: Get approved reviews with optional filters (type, targetName, rating, reviewType, hasVideo)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { type, targetName, rating, hasVideo, reviewType } = req.query;
    const filter = { status: 'Approved' };

    if (type) {
      const typeLower = type.trim().toLowerCase();
      if (typeLower === 'ngo') filter.type = 'NGO';
      else if (typeLower === 'teacher') filter.type = 'Teacher';
      else if (typeLower === 'course') filter.type = 'Course';
      else if (typeLower === 'campaign') filter.type = 'Campaign';
      else if (typeLower === 'general') filter.type = 'General';
      else filter.type = type;
    }

    if (targetName) filter.targetName = { $regex: targetName, $options: 'i' };
    if (rating) filter.rating = Number(rating);

    if (hasVideo === 'true' || reviewType === 'video') {
      filter.videoUrl = { $exists: true, $ne: '' };
    }

    const reviews = await Review.find(filter).sort({ createdAt: -1 });

    const totalCount = reviews.length;
    const videoCount = reviews.filter(r => r.videoUrl && r.videoUrl.trim() !== '').length;
    const textCount = totalCount - videoCount;
    const avgRating = totalCount > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalCount) * 10) / 10 : 0;

    res.json({
      status: true,
      count: totalCount,
      summary: {
        totalReviews: totalCount,
        videoReviewsCount: videoCount,
        textReviewsCount: textCount,
        averageRating: avgRating
      },
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/reviews/target/:targetType/:identifier
 * @desc    Get approved reviews + rating breakdown for a specific item (NGO, Campaign, Course, Teacher)
 * @access  Public
 */
router.get('/target/:targetType/:identifier', async (req, res) => {
  try {
    const { targetType, identifier } = req.params;
    const normalizedType = targetType.toUpperCase() === 'NGO' ? 'NGO'
      : targetType.toLowerCase() === 'campaign' ? 'Campaign'
      : targetType.toLowerCase() === 'course' ? 'Course'
      : targetType.toLowerCase() === 'teacher' ? 'Teacher' : 'General';

    const reviews = await Review.find({
      targetName: { $regex: new RegExp(`^${identifier}$`, 'i') },
      type: normalizedType,
      status: 'Approved'
    }).sort({ createdAt: -1 });

    const total = reviews.length;
    let averageRating = 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (total > 0) {
      const sum = reviews.reduce((acc, r) => {
        const star = Math.min(5, Math.max(1, Math.round(r.rating)));
        distribution[star] = (distribution[star] || 0) + 1;
        return acc + r.rating;
      }, 0);
      averageRating = Math.round((sum / total) * 10) / 10;
    }

    res.json({
      status: true,
      targetType: normalizedType,
      targetName: identifier,
      averageRating,
      totalReviews: total,
      ratingDistribution: distribution,
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/reviews
 * @desc    Public/User: Submit a new Text Review or Video Review with Rating
 * @access  Public / Optional Auth
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    let type = req.body.type || 'General';
    const typeLower = String(type).trim().toLowerCase();
    if (typeLower === 'ngo') type = 'NGO';
    else if (typeLower === 'teacher') type = 'Teacher';
    else if (typeLower === 'course') type = 'Course';
    else if (typeLower === 'campaign') type = 'Campaign';
    else if (typeLower === 'general') type = 'General';

    const rawVideo = req.body.videoUrl || req.body.video;
    const processedVideoUrl = saveBase64Media(rawVideo, req, 'rev_vid');

    const reviewId = req.body.reviewId || `REV-${Date.now().toString().slice(-6)}`;
    const reviewData = {
      ...req.body,
      reviewId,
      type,
      videoUrl: processedVideoUrl,
      status: req.body.status || 'Pending'
    };

    // Auto-fill user details if logged in
    if (req.user && req.user.id) {
      const dbUser = await User.findById(req.user.id);
      if (dbUser) {
        if (!reviewData.userName) reviewData.userName = dbUser.name || dbUser.organizationName || 'Verified User';
        if (!reviewData.userRole) reviewData.userRole = dbUser.role === 'donor' ? 'Donor' : dbUser.role === 'student' ? 'Student' : 'User';
      }
    }

    if (!reviewData.userName || !reviewData.targetName || !reviewData.rating || (!reviewData.comment && !reviewData.videoUrl)) {
      return res.status(400).json({
        status: false,
        message: 'userName, targetName, rating (1-5), and either comment text or videoUrl are required.'
      });
    }

    reviewData.rating = Number(reviewData.rating);
    if (reviewData.rating < 1 || reviewData.rating > 5) {
      return res.status(400).json({ status: false, message: 'Rating must be a number between 1 and 5' });
    }

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    // Recompute live rating if approved directly
    if (savedReview.status === 'Approved') {
      await recalculateTargetRating(savedReview.type, savedReview.targetName);
    }

    res.status(201).json({
      status: true,
      message: 'Review submitted successfully! It will appear publicly after approval.',
      data: savedReview
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
