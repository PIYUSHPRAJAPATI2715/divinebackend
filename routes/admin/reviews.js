const router = require('express').Router();
const Review = require('../../models/Review');
const NGO = require('../../models/NGO');
const Campaign = require('../../models/Campaign');
const Teacher = require('../../models/Teacher');
const Course = require('../../models/Course');
const path = require('path');
const fs = require('fs');

// Save Base64 file upload (Video or Image)
const saveBase64Media = (base64Str, req, defaultPrefix = 'admin_review') => {
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
    const uploadsDir = path.join(__dirname, '../../uploads');
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
 * @route   GET /api/admin/reviews
 * @desc    Admin: Get all reviews with optional filters & aggregated stats
 * @access  Private (Admin)
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, rating, search, hasVideo } = req.query;
    const filter = {};

    if (type) {
      const typeLower = type.trim().toLowerCase();
      if (typeLower === 'ngo') filter.type = 'NGO';
      else if (typeLower === 'teacher') filter.type = 'Teacher';
      else if (typeLower === 'course') filter.type = 'Course';
      else if (typeLower === 'campaign') filter.type = 'Campaign';
      else if (typeLower === 'general') filter.type = 'General';
      else filter.type = type;
    }

    if (status) filter.status = status;
    if (rating) filter.rating = Number(rating);
    if (hasVideo === 'true') filter.videoUrl = { $exists: true, $ne: '' };

    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } }
      ];
    }

    const reviews = await Review.find(filter).sort({ createdAt: -1 });

    const total = await Review.countDocuments();
    const approved = await Review.countDocuments({ status: 'Approved' });
    const pending = await Review.countDocuments({ status: 'Pending' });
    const videoReviewsCount = await Review.countDocuments({ videoUrl: { $exists: true, $ne: '' } });

    const avgRatingResult = await Review.aggregate([
      { $match: { status: 'Approved' } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? Math.round(avgRatingResult[0].avgRating * 10) / 10 : 0;

    res.json({
      status: true,
      stats: {
        total,
        approved,
        pending,
        rejected: total - approved - pending,
        videoReviewsCount,
        avgRating
      },
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/admin/reviews
 * @desc    Admin: Create & approve review directly (supports base64 video file upload)
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
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
      status: req.body.status || 'Approved'
    };

    reviewData.rating = Number(reviewData.rating) || 5;

    const newReview = new Review(reviewData);
    const savedReview = await newReview.save();

    // Recompute live rating for target entity
    await recalculateTargetRating(savedReview.type, savedReview.targetName);

    res.status(201).json({ status: true, message: 'Review created successfully', data: savedReview });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

/**
 * @route   PUT /api/admin/reviews/:id
 * @desc    Admin: Update review status (Approve/Reject) & recompute live ratings
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const rawVideo = req.body.videoUrl || req.body.video;
    if (rawVideo && rawVideo.startsWith('data:')) {
      req.body.videoUrl = saveBase64Media(rawVideo, req, 'rev_vid');
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedReview) return res.status(404).json({ status: false, message: 'Review not found' });

    // Recompute live rating for target entity
    await recalculateTargetRating(updatedReview.type, updatedReview.targetName);

    res.json({ status: true, message: 'Review updated successfully', data: updatedReview });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

/**
 * @route   DELETE /api/admin/reviews/:id
 * @desc    Admin: Delete review & recompute target rating
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (review) {
      await recalculateTargetRating(review.type, review.targetName);
    }
    res.json({ status: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
