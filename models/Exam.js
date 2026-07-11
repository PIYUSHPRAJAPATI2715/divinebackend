const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examId: { type: String, required: true, unique: true },
  courseId: { type: String, required: true }, // Mapped to Course courseId
  title: { type: String, required: true },
  duration: { type: Number, default: 30 }, // in minutes
  negativeMarking: { type: Boolean, default: false },
  negativeMarkRate: { type: Number, default: 0.25 }, // Marks deducted per wrong MCQ
  proctoringEnabled: { type: Boolean, default: true },
  webcamMonitoring: { type: Boolean, default: true },
  tabSwitchDetection: { type: Boolean, default: true },
  questions: [
    {
      questionId: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['MCQ-Single', 'MCQ-Multiple', 'Fill-In-Blank', 'Short-Answer', 'Essay', 'Match-Following', 'True-False'], 
        default: 'MCQ-Single' 
      },
      questionText: { type: String, required: true },
      options: [{ type: String }], // Used for MCQs
      correctAnswers: [{ type: String }], // Single or multiple correct
      matchPairs: [{ key: String, val: String }], // For Match-Following pairs
      marks: { type: Number, default: 1 }
    }
  ],
  
  // Advanced Proctoring Alert Thresholds / Triggers
  eyeMovementAlertsCount: { type: Number, default: 0 },
  multiplePersonAlertsCount: { type: Number, default: 0 },
  phoneDetectedCount: { type: Number, default: 0 },
  voiceDetectedCount: { type: Number, default: 0 },

  // Certification levels
  certificationLevel: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Master', 'Certified Trainer', 'Certified Mentor', 'Certified Consultant'],
    default: 'Bronze'
  }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
