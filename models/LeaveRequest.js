const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  leaveId: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true }, // Links to Teacher teacherId
  teacherName: { type: String, required: true },
  leaveType: { 
    type: String, 
    enum: ['Casual', 'Sick', 'Earned', 'Emergency', 'Maternity', 'Paternity', 'Unpaid'], 
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  substituteAssigned: { type: Boolean, default: false },
  substituteTeacherId: { type: String, default: '' },
  substituteTeacherName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
