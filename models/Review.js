const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ['Student', 'Donor', 'User'], default: 'User' },
  type: { type: String, enum: ['Teacher', 'Course', 'Campaign', 'General'], required: true },
  targetName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  videoUrl: { type: String, default: '' },
  status: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
