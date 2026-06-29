const router = require('express').Router();
const Review = require('../../models/Review');

/**
 * @route   GET /api/admin/reviews
 * @desc    Admin: Get all reviews with optional filters
 * @access  Private (Admin)
 * @query   ?type=Teacher|Course|Campaign|General
 *          &status=Approved|Pending|Rejected
 *          &rating=5
 *          &search=keyword
 */
router.get('/', async (req, res) => {
  try {
    const { type, status, rating, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (rating) filter.rating = Number(rating);
    if (search) {
      filter.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } },
        { targetName: { $regex: search, $options: 'i' } }
      ];
    }

    const reviews = await Review.find(filter).sort({ createdAt: -1 });

    // Aggregate stats
    const total = await Review.countDocuments();
    const approved = await Review.countDocuments({ status: 'Approved' });
    const pending = await Review.countDocuments({ status: 'Pending' });
    const avgRatingResult = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? Math.round(avgRatingResult[0].avgRating * 10) / 10 : 0;

    res.json({
      status: true,
      stats: { total, approved, pending, rejected: total - approved - pending, avgRating },
      data: reviews
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/admin/reviews
 * @desc    Add a new review
 * @access  Private (Admin or authenticated user)
 * @body    { userName, userRole, type, targetName, rating, comment, videoUrl }
 */
router.post('/', async (req, res) => {
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
    const newReview = new Review({ ...req.body, reviewId });
    const savedReview = await newReview.save();
    res.status(201).json({ status: true, message: 'Review submitted successfully', data: savedReview });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

/**
 * @route   PUT /api/admin/reviews/:id
 * @desc    Update review status (Approve/Reject) or any field
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  try {
    const updatedReview = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedReview) return res.status(404).json({ status: false, message: 'Review not found' });
    res.json({ status: true, message: 'Review updated', data: updatedReview });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

/**
 * @route   DELETE /api/admin/reviews/:id
 * @desc    Delete a review
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
