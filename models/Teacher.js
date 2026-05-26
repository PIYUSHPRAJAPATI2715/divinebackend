const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacherId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  expertise: { type: String, required: true },
  experience: { type: String, required: true },
  rating: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Teacher', teacherSchema);
