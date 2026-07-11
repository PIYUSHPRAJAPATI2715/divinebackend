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

// 14. Get Teacher Performance Metrics
router.get('/performance', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    // Return performance metrics (KPIs)
    res.json({
      status: true,
      data: {
        attendanceRate: teacher.performanceKPIs?.attendanceRate || 95,
        classCompletion: teacher.performanceKPIs?.classCompletionCount || 42,
        studentRating: teacher.rating || 4.8,
        courseCompletionRate: 88,
        liveClassEngagement: 92,
        studentLikes: teacher.performanceKPIs?.studentLikes || 240,
        complaintRatio: 1,
        overallPerformanceScore: teacher.performanceKPIs?.overallPerformanceScore || 94,
        history: {
          daily: [90, 92, 94, 93, 95, 94, 96],
          weekly: [92, 94, 93, 95],
          monthly: [91, 93, 94, 94, 95, 96]
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 15. Get Teacher Leave Requests & Balance
router.get('/leaves', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const LeaveRequest = require('../models/LeaveRequest');
    const requests = await LeaveRequest.find({ teacherId: teacher.teacherId }).sort({ createdAt: -1 });
    
    res.json({
      status: true,
      leaveBalance: {
        casual: teacher.leaveBalance?.casual || 8,
        sick: teacher.leaveBalance?.sick || 5,
        earned: teacher.leaveBalance?.earned || 12,
        unpaid: 30
      },
      requests
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 16. Request Leave
router.post('/leaves', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { leaveType, startDate, endDate, reason } = req.body;
    
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ status: false, message: 'Leave type, start date, and end date are required' });
    }
    
    const LeaveRequest = require('../models/LeaveRequest');
    const leaveId = `LV-${Date.now().toString().slice(-4)}`;
    
    const newRequest = new LeaveRequest({
      leaveId,
      teacherId: teacher.teacherId,
      teacherName: teacher.name,
      leaveType,
      startDate,
      endDate,
      reason: reason || '',
      status: 'Pending'
    });
    
    await newRequest.save();
    res.status(201).json({ status: true, leave: newRequest });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 17. Get Payouts Dashboard
router.get('/payouts', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const baseRate = 1200; // e.g. base amount per class
    const completedClasses = 15;
    const pendingAmount = baseRate * completedClasses;
    const incentives = 3500; // mock ratings/bonus incentives
    const deductions = 500; // mock complaint/lateness deductions
    
    res.json({
      status: true,
      data: {
        payoutModel: teacher.payoutModel?.modelType || 'Per Class',
        baseRate: teacher.payoutModel?.baseRate || baseRate,
        pendingAmount,
        approvedAmount: 18000,
        paidAmount: 32000,
        incentives,
        deductions,
        netPayable: pendingAmount + incentives - deductions,
        history: teacher.withdrawalHistory || []
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 18. Create Exam Quiz for Course
router.post('/exams', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { courseId, title, duration, negativeMarking, proctoringEnabled, questions } = req.body;
    
    if (!courseId || !title || !questions || !questions.length) {
      return res.status(400).json({ status: false, message: 'courseId, exam title, and questions array are required' });
    }
    
    const Exam = require('../models/Exam');
    const examId = `EXM-${Date.now().toString().slice(-4)}`;
    
    const newExam = new Exam({
      examId,
      courseId,
      title,
      duration: duration || 30,
      negativeMarking: !!negativeMarking,
      proctoringEnabled: proctoringEnabled !== undefined ? !!proctoringEnabled : true,
      questions: questions.map((q, idx) => ({
        questionId: `Q-${idx+1}`,
        type: q.type || 'MCQ-Single',
        questionText: q.questionText,
        options: q.options || [],
        correctAnswers: q.correctAnswers || [],
        matchPairs: q.matchPairs || [],
        marks: q.marks || 1
      }))
    });
    
    await newExam.save();
    res.status(201).json({ status: true, exam: newExam });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 19. Create Live/Recurring Class Batch
router.post('/classes/create', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { className, scheduleTime, isRecurring, durationMinutes } = req.body;

    if (!className || !scheduleTime) {
      return res.status(400).json({ status: false, message: 'Class name and schedule time are required' });
    }

    const newBatch = {
      batchName: className,
      scheduleTime,
      subject: isRecurring ? 'Recurring Lecture' : 'Instant Live Class',
      studentsCount: 15 // Mock enrollees
    };

    teacher.batches.push(newBatch);
    teacher.liveBatchesCount = (teacher.liveBatchesCount || 0) + 1;
    await teacher.save();

    res.status(201).json({ status: true, data: newBatch });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 20. Upload Digital Library Resource
router.post('/library/upload', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { title, author, category, resourceType, contentUrl } = req.body;

    if (!title || !author || !contentUrl) {
      return res.status(400).json({ status: false, message: 'Title, Author, and resource URL are required' });
    }

    const DigitalLibrary = require('../models/DigitalLibrary');
    const itemId = `LIB-${Date.now().toString().slice(-4)}`;

    const newResource = new DigitalLibrary({
      itemId,
      title,
      author,
      category: category || 'Astrology',
      resourceType: resourceType || 'Digital Book',
      contentUrl
    });

    await newResource.save();
    res.status(201).json({ status: true, data: newResource });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 21. Set Course Syllabus Structure (Modules, Chapters, Lessons)
router.post('/courses/:id/structure', async (req, res) => {
  try {
    const { modules } = req.body; // Array of Modules { title, lessons: [] }
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ status: false, message: 'Course not found' });
    }

    // Embed structure inside description/meta tags
    course.description = JSON.stringify(modules || []) + ' // ' + course.description;
    await course.save();

    res.json({ status: true, message: 'Course syllabus structure successfully saved!', modules });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 22. Get Student Analytics & Streaks
router.get('/analytics/students', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    // Find students enrolled in courses taught by this teacher
    const students = await User.find({ role: 'student' }).limit(10);
    
    const formatted = students.map((s, idx) => ({
      userId: s._id,
      name: s.name || `Astro Learner ${idx+1}`,
      dailyStudyTime: s.dailyStudyTime || 2,
      studyStreaks: s.studyStreaks || 5,
      attendanceRate: 90 + idx,
      progressPercent: 30 + idx * 10,
      weakAlert: (s.studyStreaks < 2) || (s.dailyStudyTime < 1)
    }));

    res.json({ status: true, data: formatted });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 23. Blog Management
router.post('/blogs', async (req, res) => {
  try {
    const teacher = await getOrCreateTeacherProfile(req);
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ status: false, message: 'Title and content are required' });
    }

    const Post = require('../models/Post');
    const newPost = new Post({
      postId: `PST-${Date.now().toString().slice(-4)}`,
      user: teacher.name,
      content: `[Spiritual Blog] ${title}: ${content}`,
      likes: 0
    });

    await newPost.save();
    res.status(201).json({ status: true, data: newPost });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
