const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  price: { type: String, required: true },
  duration: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Published', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
