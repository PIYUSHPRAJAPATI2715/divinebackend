const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');

// Helper to get or create Teacher profile connected to logged-in User
const getOrCreateTeacherProfile = async (req) => {
  let teacher = await Teacher.findOne({
    $or: [
      { phone: req.user.phone },
      { email: req.user.email }
    ]
  });

  if (!teacher) {
    // Dynamically create a Teacher record if it doesn't exist
    const name = req.user.name || 'Astro Coach';
    const email = req.user.email || 'teacher@astroadvyc.com';
    const phone = req.user.phone || '';
    
    teacher = new Teacher({
      teacherId: `TCH-${Date.now().toString().slice(-4)}`,
      name,
      email,
      phone,
      expertise: req.user.expertise || 'Astrology',
      experience: req.user.experience || '5 Yrs',
      about: req.user.about || '',
      status: 'Verified',
      kycStatus: 'Completed',
      totalEarnings: 0,
      withdrawableAmount: 0,
      liveBatchesCount: 0
    });
    await teacher.save();
  }
  return teacher;
};

// 1. Get Teacher Profile
router.get('/profile', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Add Class Batch
router.post('/batches', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { batchName, scheduleTime, subject } = req.body;
    
    if (!batchName || !scheduleTime || !subject) {
      return res.status(400).json({ message: 'Batch name, schedule time, and subject are required' });
    }
    
    const newBatch = {
      batchName,
      scheduleTime,
      subject,
      studentsCount: 0
    };
    
    teacher.batches.push(newBatch);
    teacher.liveBatchesCount = (teacher.liveBatchesCount || 0) + 1;
    await teacher.save();
    
    res.status(201).json(teacher.batches[teacher.batches.length - 1]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. Delete Class Batch
router.delete('/batches/:id', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const batchId = req.params.id;
    
    const initialLength = teacher.batches.length;
    teacher.batches = teacher.batches.filter(b => b._id.toString() !== batchId);
    
    if (teacher.batches.length === initialLength) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    teacher.liveBatchesCount = Math.max(0, (teacher.liveBatchesCount || 0) - 1);
    await teacher.save();
    
    res.json({ message: 'Batch deleted successfully', batches: teacher.batches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Request Withdrawal
router.post('/withdrawals', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    
    const newWithdrawal = {
      amount: Number(amount),
      requestedAt: new Date(),
      status: 'Pending',
      transactionId: ''
    };
    
    teacher.withdrawalHistory.push(newWithdrawal);
    await teacher.save();
    
    res.status(201).json({ status: true, withdrawal: newWithdrawal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Get Courses Assigned
router.get('/courses', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    // Find courses where the instructor matches the teacher's name
    const courses = await Course.find({ instructor: teacher.name }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
