const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  price: { type: String, required: true }, // e.g. "₹4,999"
  duration: { type: String, required: true }, // e.g. "30 Hrs"
  category: { type: String, default: 'General Astrology' }, // Palmistry, Face Reading, Tarot, etc.
  description: { type: String, default: '' },
  liveClassSchedule: { type: String, default: '' }, // e.g. "Mon, Wed, Fri - 8:00 PM"
  assignmentsCount: { type: Number, default: 0 },
  modules: [{ type: String }], // Array of video module titles/subjects
  status: { type: String, enum: ['Pending', 'Published', 'Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
