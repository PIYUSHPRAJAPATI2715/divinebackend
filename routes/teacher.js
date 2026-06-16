const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const User = require('../models/User');
const Student = require('../models/Student');

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
    const courses = await Course.find({ instructor: teacher.name }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Update Teacher Profile (including linked User details/bank accounts)
router.put('/profile', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { 
      expertise, 
      experience, 
      about,
      gender,
      bankAccountHolder,
      bankName,
      bankBranch,
      bankAccountNumber,
      bankIFSC
    } = req.body;

    if (expertise) teacher.expertise = expertise;
    if (experience) teacher.experience = experience;
    if (about !== undefined) teacher.about = about;
    await teacher.save();

    // Sync user details
    const user = await User.findById(req.user.id);
    if (user) {
      if (gender) user.gender = gender;
      if (bankAccountHolder) user.bankAccountHolder = bankAccountHolder;
      if (bankName) user.bankName = bankName;
      if (bankBranch) user.bankBranch = bankBranch;
      if (bankAccountNumber) user.bankAccountNumber = bankAccountNumber;
      if (bankIFSC) user.bankIFSC = bankIFSC;
      await user.save();
    }

    res.json({ status: true, teacher, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. Add Course Taught by Teacher
router.post('/courses', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { title, price, duration, category, description, liveClassSchedule } = req.body;

    if (!title || !price || !duration) {
      return res.status(400).json({ message: 'Title, price, and duration are required' });
    }

    const newCourse = new Course({
      courseId: `CRS-${Date.now().toString().slice(-4)}`,
      title,
      instructor: teacher.name,
      price,
      duration,
      category: category || 'General Astrology',
      description: description || '',
      liveClassSchedule: liveClassSchedule || '',
      status: 'Published' // Auto-approve courses launched by verified teachers
    });

    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 8. Update Course Taught by Teacher
router.put('/courses/:id', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor !== teacher.name) {
      return res.status(403).json({ message: 'Unauthorized. You can only update your own courses.' });
    }

    const { title, price, duration, category, description, liveClassSchedule } = req.body;

    if (title) course.title = title;
    if (price) course.price = price;
    if (duration) course.duration = duration;
    if (category) course.category = category;
    if (description !== undefined) course.description = description;
    if (liveClassSchedule !== undefined) course.liveClassSchedule = liveClassSchedule;

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 9. Delete Course Taught by Teacher
router.delete('/courses/:id', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor !== teacher.name) {
      return res.status(403).json({ message: 'Unauthorized. You can only delete your own courses.' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Get Enrolled Students for Teacher's Courses
router.get('/students', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    // Find all courses taught by this teacher
    const courses = await Course.find({ instructor: teacher.name });
    const courseTitles = courses.map(c => c.title);

    // Find students enrolled in any of these courses
    const students = await Student.find({ courseEnrolled: { $in: courseTitles } }).sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 11. Go Live (Simulated Session creation)
router.post('/courses/:id/go-live', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor !== teacher.name) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    course.liveClassDetails = {
      agoraSessionId: `agora-session-${Date.now()}`,
      activeStudents: Math.floor(Math.random() * 20) + 5
    };

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. End Live Session
router.post('/courses/:id/end-live', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor !== teacher.name) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    course.liveClassDetails = {
      agoraSessionId: '',
      activeStudents: 0
    };

    await course.save();
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. Add Recorded Lecture
router.post('/courses/:id/recordings', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructor !== teacher.name) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const { title, description, videoUrl, duration } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Video title is required' });
    }

    course.recordedVideos.push({
      title,
      description: description || '',
      videoUrl: videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
      duration: duration || '15 Mins',
      uploadedAt: new Date()
    });

    await course.save();
    res.status(201).json(course.recordedVideos[course.recordedVideos.length - 1]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
