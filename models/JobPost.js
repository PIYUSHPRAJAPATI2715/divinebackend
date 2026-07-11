const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  employerName: { type: String, required: true },
  logo: { type: String, default: '' },
  title: { type: String, required: true }, // e.g. Vedic Astrologer, Yoga Instructor
  jobType: { 
    type: String, 
    enum: ['Full-time', 'Part-time', 'Freelance', 'Remote', 'Internship'], 
    default: 'Full-time' 
  },
  category: { type: String, default: 'Astrology' }, // Astrology, Wellness, Wellness, Sales, content
  salaryRange: { type: String, default: 'Competitive' },
  location: { type: String, default: 'Remote' },
  description: { type: String, default: '' },
  skillsRequired: [{ type: String }],
  isActive: { type: Boolean, default: true },
  applicants: [
    {
      studentId: { type: String },
      studentName: { type: String },
      studentPhone: { type: String },
      resumeUrl: { type: String },
      status: { type: String, enum: ['Applied', 'Shortlisted', 'Interviewing', 'Selected', 'Rejected'], default: 'Applied' },
      appliedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('JobPost', jobPostSchema);
