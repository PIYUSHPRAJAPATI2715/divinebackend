const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  courseEnrolled: { type: String, required: true },
  marks: { type: Number, default: 0 },
  testStatus: { type: String, enum: ['Passed', 'Failed', 'Pending'], default: 'Pending' },
  scholarshipStatus: { type: String, enum: ['None', 'Applied', 'Approved', 'Rejected'], default: 'None' },
  scholarshipAmount: { type: String, default: '₹0' },
  referredBy: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  attendanceRate: { type: Number, default: 100 }, // Attendance percentage
  certificatesEarned: [{ type: String }], // Array of Certificate URLs
  assignmentsSubmitted: [
    {
      assignmentTitle: { type: String },
      submittedAt: { type: Date, default: Date.now },
      score: { type: Number, default: 0 }
    }
  ],
  testsCompleted: [
    {
      testTitle: { type: String },
      completedAt: { type: Date, default: Date.now },
      score: { type: Number, default: 0 }
    }
  ],
  subscriptionPlan: { type: String, enum: ['None', 'Course Purchase', 'Basic Monthly', 'Premium Yearly'], default: 'None' },
  pdfDownloads: [
    {
      title: { type: String },
      downloadedAt: { type: Date, default: Date.now }
    }
  ],
  batchDiscussions: [
    {
      roomName: { type: String },
      joinedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
