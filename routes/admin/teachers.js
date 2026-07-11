const router = require('express').Router();
const Teacher = require('../../models/Teacher');

// Get all teachers
router.get('/', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single teacher detailed profile
router.get('/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new teacher
router.post('/', async (req, res) => {
  try {
    const newTeacher = new Teacher({ ...req.body, teacherId: `TCH-${Date.now().toString().slice(-4)}` });
    const savedTeacher = await newTeacher.save();
    res.status(201).json(savedTeacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a teacher
router.put('/:id', async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true }
    );
    res.json(updatedTeacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a teacher
router.delete('/:id', async (req, res) => {
  try {
    await Teacher.findByIdAndDelete(req.params.id);
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Leaves Requests Manager
router.get('/leaves/requests', async (req, res) => {
  try {
    const LeaveRequest = require('../../models/LeaveRequest');
    const requests = await LeaveRequest.find().sort({ createdAt: -1 });
    res.json({ status: true, data: requests });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.put('/leaves/requests/:id', async (req, res) => {
  try {
    const LeaveRequest = require('../../models/LeaveRequest');
    const { status, substituteTeacherId, substituteTeacherName } = req.body;

    const request = await LeaveRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ status: false, message: 'Leave request not found' });
    }

    if (status) request.status = status;
    if (substituteTeacherId && substituteTeacherName) {
      request.substituteAssigned = true;
      request.substituteTeacherId = substituteTeacherId;
      request.substituteTeacherName = substituteTeacherName;
    }

    await request.save();
    res.json({ status: true, message: `Leave request status updated to ${request.status}`, data: request });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin Automated Payout Runner
router.post('/payouts/run', async (req, res) => {
  try {
    const teachers = await Teacher.find({ status: 'Verified' });
    const auditLogs = [];

    for (let teacher of teachers) {
      // Calculate mock payout
      const baseEarn = 18000;
      const incentiveRate = teacher.rating >= 4.5 ? 2000 : 0;
      const penaltyRate = 500;
      const netPayable = baseEarn + incentiveRate - penaltyRate;

      // Update withdrawable amount
      teacher.withdrawableAmount = (teacher.withdrawableAmount || 0) + netPayable;
      teacher.totalEarnings = (teacher.totalEarnings || 0) + netPayable;
      
      // Auto-add an approved transaction in history representing payout disbursement
      teacher.withdrawalHistory.push({
        amount: netPayable,
        requestedAt: new Date(),
        status: 'Approved',
        transactionId: `PAY-${Date.now().toString().slice(-4)}`
      });

      await teacher.save();
      auditLogs.push({
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        disbursedAmount: netPayable,
        status: 'Disbursed'
      });
    }

    res.json({ status: true, message: 'Automated Payout System successfully processed payouts!', data: auditLogs });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin Teacher Monitoring & Compliance Log
router.post('/monitoring/compliance', async (req, res) => {
  try {
    const { teacherId, dressCodePassed, audioQuality, videoQuality, observations } = req.body;
    if (!teacherId) {
      return res.status(400).json({ status: false, message: 'Teacher ID is required' });
    }

    const teacher = await Teacher.findOne({ teacherId });
    if (!teacher) {
      return res.status(404).json({ status: false, message: 'Teacher not found' });
    }

    // Store observation details on teacher details
    teacher.about = `[Admin Checked: Dress Code - ${dressCodePassed ? 'OK' : 'Infraction'}, Audio - ${audioQuality}, Video - ${videoQuality}. Note: ${observations || 'No issues'}] ` + (teacher.about || '');
    await teacher.save();

    res.json({ status: true, message: 'Compliance and activity monitoring successfully saved!', data: teacher });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Admin Emergency Notifications Broadcast
router.post('/emergency-broadcast', async (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ status: false, message: 'Title and message are required' });
    }

    // Mock sending push notification to all users
    res.json({ status: true, message: `Emergency broadcast "${title}" sent to all enrollees and teachers!` });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Surepass Mock ID Verification (Aadhar/PAN)
router.post('/verify-identity', async (req, res) => {
  try {
    const { idType, idNumber } = req.body; // Aadhaar, PAN
    if (!idType || !idNumber) {
      return res.status(400).json({ status: false, message: 'ID Type and ID Number are required' });
    }

    // Return mock success with verification ID
    res.json({
      status: true,
      message: `${idType} identity verified successfully via Surepass secure API!`,
      verificationReference: `SP-${Date.now().toString().slice(-6)}`
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Platform Financials Monthly Reports (P&L, Revenue)
router.get('/financials/monthly', async (req, res) => {
  try {
    // Return mock monthly financials summary
    res.json({
      status: true,
      data: {
        monthlyRevenue: 125000,
        teacherPayments: 45000,
        platformCommission: 12500,
        refunds: 2500,
        pendingPayments: 5000,
        profitAndLoss: 65000
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Emergency Substitute Allocation
router.post('/emergency/substitute', async (req, res) => {
  try {
    const { leaveRequestId, substituteTeacherId } = req.body;
    if (!leaveRequestId || !substituteTeacherId) {
      return res.status(400).json({ status: false, message: 'Leave Request ID and Substitute Teacher ID are required' });
    }

    const LeaveRequest = require('../../models/LeaveRequest');
    const reqObj = await LeaveRequest.findById(leaveRequestId);
    if (!reqObj) {
      return res.status(404).json({ status: false, message: 'Leave request not found' });
    }

    const sub = await Teacher.findOne({ teacherId: substituteTeacherId });
    if (!sub) {
      return res.status(404).json({ status: false, message: 'Substitute teacher profile not found' });
    }

    reqObj.status = 'Approved';
    reqObj.substituteAssigned = true;
    reqObj.substituteTeacherId = sub.teacherId;
    reqObj.substituteTeacherName = sub.name;
    await reqObj.save();

    res.json({
      status: true,
      message: `Successfully allocated substitute teacher "${sub.name}" to request!`,
      data: reqObj
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
