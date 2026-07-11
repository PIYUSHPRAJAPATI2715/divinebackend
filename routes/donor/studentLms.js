const express = require('express');
const router = express.Router();
const Exam = require('../../models/Exam');
const JobPost = require('../../models/JobPost');
const Product = require('../../models/Product');
const User = require('../../models/User');

// Helper to check and retrieve the current student profile context
const getStudentProfile = async (req) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new Error('User context not found');
  return user;
};

/**
 * @route   GET /api/donor/student/exams
 * @desc    Get all available course assessment exams
 */
router.get('/student/exams', async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json({ status: true, data: exams });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/exams/:examId/submit
 * @desc    Submit quiz answers, auto-grade, apply negative marking, log proctoring infractions
 */
router.post('/student/exams/:examId/submit', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { answers, tabSwitches, webcamInfractions } = req.body;
    
    const exam = await Exam.findOne({ examId: req.params.examId });
    if (!exam) {
      return res.status(404).json({ status: false, message: 'Exam not found' });
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    exam.questions.forEach(q => {
      totalMaxMarks += q.marks || 1;
      const studentAns = answers?.[q.questionId];

      if (studentAns !== undefined) {
        // Handle MCQ array comparison or exact string match
        const correct = Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswers];
        const student = Array.isArray(studentAns) ? studentAns : [studentAns];

        const isCorrect = correct.length === student.length && correct.every(val => student.includes(val));

        if (isCorrect) {
          totalMarksObtained += q.marks || 1;
        } else if (exam.negativeMarking) {
          totalMarksObtained -= (q.marks || 1) * (exam.negativeMarkRate || 0.25);
        }
      }
    });

    // Ensure score is not negative
    totalMarksObtained = Math.max(0, Math.round(totalMarksObtained * 100) / 100);
    const passPercentage = 50;
    const scorePercentage = (totalMarksObtained / totalMaxMarks) * 100;
    const isPassed = scorePercentage >= passPercentage;

    // Proctoring Infractions Log
    const proctoringLog = {
      tabSwitches: Number(tabSwitches || 0),
      webcamInfractions: Number(webcamInfractions || 0),
      disqualified: Number(tabSwitches || 0) > 3 // disqualified if tab switches exceed 3 times
    };

    // Generate Certificate on Pass
    let certificate = null;
    if (isPassed && !proctoringLog.disqualified) {
      certificate = {
        certificateId: `DIVINE-CERT-${Date.now().toString().slice(-6).toUpperCase()}`,
        studentName: student.name || 'Astro Student',
        courseTitle: exam.title,
        issuedAt: new Date(),
        qrVerificationUrl: `https://astrolms.divine.org/verify/certs/${Date.now()}`
      };
    }

    res.json({
      status: true,
      data: {
        examId: exam.examId,
        score: totalMarksObtained,
        maxMarks: totalMaxMarks,
        scorePercentage,
        isPassed,
        proctoringLog,
        certificate
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/donor/student/internships
 * @desc    Get Phase 1, Phase 2, and Phase 3 internship milestones and progress
 */
router.get('/student/internships', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    
    // Check milestones based on course enrollees mockup
    const phase1Unlocked = true; // Unlocked after 20-30% completion
    const phase2Unlocked = false; // Unlocked after 50-70% completion
    const phase3Unlocked = false; // Unlocked after 85-100% completion

    res.json({
      status: true,
      data: {
        currentPhase: 1,
        milestones: [
          {
            phase: 1,
            title: 'Micro-Internship (Small Practical Tasks)',
            unlocked: phase1Unlocked,
            completed: !!student.microInternshipCompleted,
            taskDescription: 'Write a basic birth chart analysis report (1-3 hours task).'
          },
          {
            phase: 2,
            title: 'Guided Internship (Structured mentor support)',
            unlocked: phase2Unlocked,
            completed: false,
            taskDescription: 'Solve real-user birth chart consultations with weekly reviews (2 Weeks).'
          },
          {
            phase: 3,
            title: 'Full Internship (AstroAdvyc Placement)',
            unlocked: phase3Unlocked,
            completed: false,
            taskDescription: 'Deliver measurable output for a corporate brand client (4-6 Weeks).'
          }
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/internships/submit
 * @desc    Submit task details to complete a micro-internship phase
 */
router.post('/student/internships/submit', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { phase, taskContent } = req.body;

    if (!phase) {
      return res.status(400).json({ status: false, message: 'Internship phase is required' });
    }

    if (Number(phase) === 1) {
      student.microInternshipCompleted = true;
      await student.save();
    }

    res.json({
      status: true,
      message: `Phase ${phase} internship task submitted and completed successfully!`,
      certificateUrl: `https://astrolms.divine.org/certs/internship_phase_${phase}.pdf`
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/donor/student/jobs
 * @desc    List available job board entries
 */
router.get('/student/jobs', async (req, res) => {
  try {
    const jobs = await JobPost.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ status: true, data: jobs });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/jobs/:jobId/apply
 * @desc    Apply to a specific job listing
 */
router.post('/student/jobs/:jobId/apply', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { resumeUrl } = req.body;

    const job = await JobPost.findOne({ jobId: req.params.jobId });
    if (!job) {
      return res.status(404).json({ status: false, message: 'Job posting not found' });
    }

    // Check if already applied
    const alreadyApplied = job.applicants.some(app => app.studentId === student._id.toString());
    if (alreadyApplied) {
      return res.status(400).json({ status: false, message: 'You have already applied to this job.' });
    }

    job.applicants.push({
      studentId: student._id,
      studentName: student.name || 'Anonymous Student',
      studentPhone: student.phone || '',
      resumeUrl: resumeUrl || 'uploads/sample_resume.pdf',
      status: 'Applied'
    });

    await job.save();
    res.json({ status: true, message: `Successfully applied to "${job.title}" at "${job.employerName}"` });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/donor/student/products
 * @desc    List Learning Mart catalog
 */
router.get('/student/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ status: true, data: products });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/products/checkout
 * @desc    Buy books or Practicing gadgets (mock checkout)
 */
router.post('/student/products/checkout', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { productId, quantity } = req.body;

    const product = await Product.findOne({ productId });
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    const qty = Number(quantity || 1);
    const subtotal = product.price * qty;
    const commissionRate = 0.1; // 10% platform commission
    const platformCommission = subtotal * commissionRate;

    // Simulate checkout and deduct wallet if balance is sufficient
    if ((student.walletBalance || 0) < subtotal) {
      return res.status(400).json({ status: false, message: 'Insufficient wallet balance. Please top up.' });
    }

    student.walletBalance -= subtotal;
    await student.save();

    res.json({
      status: true,
      message: `Successfully purchased ${qty}x "${product.title}" via wallet!`,
      data: {
        totalPaid: subtotal,
        platformCommission,
        shippingPartner: 'ShipRocket'
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/donor/student/library
 * @desc    Get/Search digital library resources
 */
router.get('/student/library', async (req, res) => {
  try {
    const DigitalLibrary = require('../../models/DigitalLibrary');
    let items = await DigitalLibrary.find();

    if (items.length === 0) {
      // Seed default mock catalog books
      const defaultItems = [
        {
          itemId: 'LIB-001',
          title: 'Light on Life: An Introduction to Astrology',
          author: 'Hart de Fouw',
          publisher: 'Spiritual Press',
          keyword: 'Vedic',
          category: 'Astrology',
          resourceType: 'Digital Book',
          language: 'English',
          publicationYear: 2021,
          difficultyLevel: 'Beginner',
          tags: ['Vedic', 'Kundali'],
          contentUrl: '/uploads/light_on_life.pdf',
          pagesCount: 150
        },
        {
          itemId: 'LIB-002',
          title: 'The Tarot Bible: Definitive Guide',
          author: 'Sarah Bartlett',
          publisher: 'Mystic Publisher',
          keyword: 'Tarot',
          category: 'Tarot',
          resourceType: 'Digital Book',
          language: 'English',
          publicationYear: 2023,
          difficultyLevel: 'Intermediate',
          tags: ['Tarot', 'Divination'],
          contentUrl: '/uploads/tarot_bible.pdf',
          pagesCount: 220
        },
        {
          itemId: 'LIB-003',
          title: 'Patanjali Yoga Sutras & Meditation',
          author: 'Swami Prabhavananda',
          publisher: 'Vedanta Society',
          keyword: 'Yoga',
          category: 'Yoga',
          resourceType: 'Digital Book',
          language: 'English',
          publicationYear: 2018,
          difficultyLevel: 'Advanced',
          tags: ['Meditation', 'Yoga Sutras'],
          contentUrl: '/uploads/yoga_sutras.pdf',
          pagesCount: 180
        }
      ];
      await DigitalLibrary.insertMany(defaultItems);
      items = await DigitalLibrary.find();
    }

    res.json({ status: true, data: items });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/library/log
 * @desc    Log reading pages and update study streaks
 */
router.post('/student/library/log', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { pagesRead, hoursSpent } = req.body;

    const currentPages = Number(pagesRead || 10);
    const currentHours = Number(hoursSpent || 1);

    student.readingAnalytics = {
      pagesRead: (student.readingAnalytics?.pagesRead || 0) + currentPages,
      hours: (student.readingAnalytics?.hours || 0) + currentHours,
      streak: (student.readingAnalytics?.streak || 0) + 1
    };

    // Update study streak consistency
    student.studyStreaks = (student.studyStreaks || 0) + 1;
    student.dailyStudyTime = currentHours;

    await student.save();
    res.json({
      status: true,
      message: 'Reading progress logged successfully!',
      data: {
        studyStreaks: student.studyStreaks,
        readingAnalytics: student.readingAnalytics
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/digital-reader/actions
 * @desc    Save book bookmark, sticky note, or highlight
 */
router.post('/student/digital-reader/actions', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { actionType, noteText, pageNumber } = req.body;

    // Save notes/highlights inside student's weeklyGoals or profile notes
    const remark = `[Reader Note: ${actionType} on Page ${pageNumber || 1} - "${noteText}"]`;
    student.weeklyGoals.push(remark);
    await student.save();

    res.json({ status: true, message: `Digital reader action "${actionType}" saved!`, remark });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   GET /api/donor/student/events
 * @desc    Get virtual conferences and webinars
 */
router.get('/student/events', async (req, res) => {
  try {
    const LmsEvent = require('../../models/LmsEvent');
    let events = await LmsEvent.find();

    if (events.length === 0) {
      // Seed default events
      const defaultEvents = [
        {
          eventId: 'EVT-101',
          title: 'International Astrology & Kundali Summit 2026',
          description: 'A global conference with top Astrologers on Vedic & Lal Kitab methodologies.',
          type: 'Concounts',
          venue: 'Online Zoom Room',
          dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          timeZone: 'IST',
          ticketPricePlan: { basic: 0, premium: 399, vip: 899 },
          speakers: [
            { name: 'Dr. Vivek Dev', biography: 'Famous Vedic astrologer and Sanskrit scholar.', socialLink: 'https://linkedin.com' }
          ]
        },
        {
          eventId: 'EVT-102',
          title: 'Tarot Deck Reading Mastery Workshop',
          description: 'Interactive practical workshop covering Tarot spreads and psychic intuition.',
          type: 'Workshops',
          venue: 'Agora Classroom Live',
          dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          timeZone: 'IST',
          ticketPricePlan: { basic: 0, premium: 250, vip: 500 },
          speakers: [
            { name: 'Kavita Shah', biography: 'Professional Tarot reader and Reiki master.', socialLink: 'https://youtube.com' }
          ]
        }
      ];
      await LmsEvent.insertMany(defaultEvents);
      events = await LmsEvent.find();
    }

    res.json({ status: true, data: events });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/events/:eventId/ticket
 * @desc    Purchase virtual conference/webinar tickets using wallet
 */
router.post('/student/events/:eventId/ticket', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { ticketType } = req.body; // 'basic', 'premium', 'vip'

    const LmsEvent = require('../../models/LmsEvent');
    const event = await LmsEvent.findOne({ eventId: req.params.eventId });
    if (!event) {
      return res.status(404).json({ status: false, message: 'Event not found' });
    }

    // Verify if already registered
    const alreadyRegistered = event.attendees.some(att => att.userId === student._id.toString());
    if (alreadyRegistered) {
      return res.status(400).json({ status: false, message: 'You are already registered for this event.' });
    }

    const plan = ticketType || 'basic';
    const cost = event.ticketPricePlan[plan] || 0;

    if (student.walletBalance < cost) {
      return res.status(400).json({ status: false, message: 'Insufficient wallet balance for ticket purchase' });
    }

    student.walletBalance -= cost;
    await student.save();

    event.attendees.push({
      userId: student._id.toString(),
      name: student.name || 'Astro Student',
      ticketType: plan.toUpperCase() === 'VIP' ? 'VIP' : plan.toUpperCase() === 'PREMIUM' ? 'Premium' : 'Basic',
      checkedIn: true
    });
    await event.save();

    res.json({
      status: true,
      message: `Successfully booked "${plan}" ticket for "${event.title}"!`,
      ticketPrice: cost
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/career/generate
 * @desc    Generate student cover letter and mock personal webpage subdomain
 */
router.post('/student/career/generate', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { specialization, coverLetterInput } = req.body;

    const formattedName = (student.name || 'student').toLowerCase().replace(/\s+/g, '');
    student.personalWebpageUrl = `https://${formattedName}.astroadvyc.com`;
    student.coverLetterTemplate = `Dear Hiring Team,\n\nI am writing to express my interest in the ${specialization || 'Vedic Astrologer'} role. As a certified AstroLearning graduate specializing in ${specialization || 'Kundali Reading'} with a high exam proctoring verification index, I am confident in my consulting skills.\n\nSincerely,\n${student.name}`;
    student.careerSupportPlan = 'Premium';

    await student.save();
    res.json({
      status: true,
      message: 'Cover letter and subdomain personal web page generated successfully!',
      data: {
        personalWebpageUrl: student.personalWebpageUrl,
        coverLetterTemplate: student.coverLetterTemplate
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/clubs/join
 * @desc    Join Tarot, Yoga, Meditation, Research, or Language clubs
 */
router.post('/student/clubs/join', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { clubName } = req.body; // 'Tarot Club', 'Meditation Club', 'Yoga Club'

    if (!clubName) {
      return res.status(400).json({ status: false, message: 'Club name is required' });
    }

    if (student.joinedClubs.includes(clubName)) {
      return res.status(400).json({ status: false, message: 'You have already joined this club.' });
    }

    student.joinedClubs.push(clubName);
    await student.save();

    res.json({ status: true, message: `Successfully joined the ${clubName}!`, data: student.joinedClubs });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/scholarships
 * @desc    File application for Merit/Financial need scholarships
 */
router.post('/student/scholarships', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    const { scholarshipType, reason } = req.body;

    if (!scholarshipType) {
      return res.status(400).json({ status: false, message: 'Scholarship Type is required' });
    }

    if (student.scholarshipsApplied.includes(scholarshipType)) {
      return res.status(400).json({ status: false, message: 'You have already applied for this scholarship.' });
    }

    student.scholarshipsApplied.push(scholarshipType);
    student.scholarshipsStatus = 'Applied';
    await student.save();

    res.json({
      status: true,
      message: `Successfully filed scholarship application for: ${scholarshipType}`,
      data: student.scholarshipsApplied
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/donor/student/ethics/complete
 * @desc    Mark ethics & responsible practice module as completed
 */
router.post('/student/ethics/complete', async (req, res) => {
  try {
    const student = await getStudentProfile(req);
    // Mark ethics course completion
    student.weeklyGoals.push('[Ethics Module: COMPLETED - Professional Code of Conduct, Confidentiality & disclaimers]');
    await student.save();

    res.json({ status: true, message: 'Ethics & Responsible Practice Module completed! Certification unlocked!' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
