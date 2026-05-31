const Campaign = require('./models/Campaign');
const Teacher = require('./models/Teacher');
const Course = require('./models/Course');
const NGO = require('./models/NGO');
const Donor = require('./models/Donor');
const Admin = require('./models/Admin');
const Student = require('./models/Student');
const Transaction = require('./models/Transaction');
const Review = require('./models/Review');
const Post = require('./models/Post');
const SubjectCategory = require('./models/SubjectCategory');
const Banner = require('./models/Banner');
const NewsMedia = require('./models/NewsMedia');
const Seminar = require('./models/Seminar');
const Referral = require('./models/Referral');

const mockCampaigns = [
  { 
    campaignId: 'CMP-101', 
    title: 'Help for Heart Surgery', 
    user: 'Rahul Sharma', 
    category: 'Fundraising',
    description: 'Urgent funding request for a life-saving double heart bypass surgery at Escorts Heart Institute. The family is in need of emergency funding support.',
    goal: '₹5,00,000', 
    raised: '₹2,45,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Pending',
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/hospital_estimate_rahul.pdf', 'https://s3.amazonaws.com/divine-docs/medical_case_rahul.jpg'],
    withdrawalRequested: false,
    withdrawalStatus: 'None',
    withdrawalRequests: []
  },
  { 
    campaignId: 'CMP-102', 
    title: 'Education for 10 Girls', 
    user: 'NGO Pratham', 
    category: 'NGO Donation',
    description: 'Sponsor dynamic elementary schooling, tuition fees, uniforms, and study books for 10 unprivileged girl students in urban slum areas of New Delhi.',
    goal: '₹1,0,000', 
    raised: '₹80,000', 
    oneTimeOrMonthly: 'Monthly',
    status: 'Live',
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/ngo_registration_pratham.pdf'],
    withdrawalRequested: true,
    withdrawalStatus: 'Requested',
    withdrawalRequests: [
      { amount: 45000, requestedAt: new Date('2026-05-15'), status: 'Pending' }
    ]
  },
  { 
    campaignId: 'CMP-103', 
    title: 'Gaugrass Fodder Request', 
    user: 'Krishnayan Gaushala', 
    category: 'Gau Seva',
    description: 'Support pure fodder (gausharan grass) distribution for over 200 abandoned indigenous cows at Haridwar gaushala.',
    goal: '₹50,000', 
    raised: '₹50,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Completed',
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/gaushala_trust_deed.pdf'],
    withdrawalRequested: true,
    withdrawalStatus: 'Approved',
    withdrawalRequests: [
      { amount: 50000, requestedAt: new Date('2026-05-20'), status: 'Approved', releasedAt: new Date('2026-05-21') }
    ]
  },
  { 
    campaignId: 'CMP-104', 
    title: 'Medical emergency - Accident', 
    user: 'Sneha Verma', 
    category: 'Fundraising',
    description: 'Road accident emergency surgery and ICU ventilation recovery support for Amit Verma at Max Healthcare.',
    goal: '₹2,00,000', 
    raised: '₹10,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Pending',
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/accident_reports.pdf'],
    withdrawalRequested: false,
    withdrawalStatus: 'None'
  },
  { 
    campaignId: 'CMP-105', 
    title: 'Winter Clothes Distribution', 
    user: 'Hope NGO', 
    category: 'NGO Donation',
    description: 'Help us distribute warm winter blankets, high-quality sweaters, and shoes to thousands of homeless families sleeping on Delhi streets.',
    goal: '₹75,000', 
    raised: '₹25,000', 
    oneTimeOrMonthly: 'Both',
    status: 'Live',
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/hope_ngo_profile.pdf'],
    withdrawalRequested: false,
    withdrawalStatus: 'None'
  },
];

const mockCourses = [
  { 
    courseId: 'CRS-201', 
    title: 'Vedic Astrology Masterclass', 
    instructor: 'Dr. Ramesh Jyotish', 
    price: '₹4,999', 
    duration: '30 Hrs', 
    category: 'Kundli Analysis',
    description: 'Comprehensive detailed masterclass on analyzing natal charts (Kundli), transit planetary effects, house alignment alignments, and effective gemstone remedies.',
    liveClassSchedule: 'Mon, Wed, Fri - 7:00 PM',
    assignmentsCount: 6,
    modules: ['Introduction to 12 Houses', 'Planet transits and Shani Sade Sati', 'Yogas & Doshas in Kundli', 'Gemstone and Pooja Remedies'],
    status: 'Published',
    liveClassDetails: { agoraSessionId: 'SESSION-VEDIC-201', activeStudents: 15 }
  },
  { 
    courseId: 'CRS-202', 
    title: 'Tarot for Beginners', 
    instructor: 'Priya Sharma', 
    price: '₹2,499', 
    duration: '15 Hrs', 
    category: 'Tarot Reading',
    description: 'Unlock the secret magic of Major and Minor Arcana cards. Learn card spreads, intuitive interpretation, and spiritual cleansing techniques.',
    liveClassSchedule: 'Tue, Thu - 6:00 PM',
    assignmentsCount: 3,
    modules: ['Major Arcana Archetypes', 'The Rider-Waite-Smith Symbolisms', 'Simple Card Spreads', 'Reading Ethics & Intuition'],
    status: 'Pending',
    liveClassDetails: { agoraSessionId: '', activeStudents: 0 }
  },
  { 
    courseId: 'CRS-203', 
    title: 'Advanced Palmistry', 
    instructor: 'Acharya Amit', 
    price: '₹3,999', 
    duration: '20 Hrs', 
    category: 'Palmistry',
    description: 'Detailed analysis of main hand lines (Life, Heart, Head, Fate), planetary mounts, fingers structures, and major hand markings.',
    liveClassSchedule: 'Sat, Sun - 11:00 AM',
    assignmentsCount: 4,
    modules: ['The Four Hand Types', 'Deciphering the Three Major Lines', 'Planetary Mounts Analysis', 'Reading Fate & Travel Markings'],
    status: 'Published',
    liveClassDetails: { agoraSessionId: 'SESSION-PALM-203', activeStudents: 8 }
  },
];

const mockTeachers = [
  { 
    teacherId: 'TCH-001', 
    name: 'Dr. Ramesh Jyotish', 
    email: 'ramesh.jyotish@astroadvyc.com',
    phone: '9812345678',
    expertise: 'Vedic Astrology', 
    experience: '15 Yrs', 
    about: 'Dr. Ramesh holds a PhD in Astrology and has consulted over 10,000+ individuals globally on carrier, relationships, and health.',
    status: 'Verified', 
    rating: 4.8,
    kycStatus: 'Completed',
    certificates: ['https://s3.amazonaws.com/divine-docs/vedic_astrology_phd.pdf', 'kyc_proof_ramesh.jpg'],
    totalEarnings: 95000,
    withdrawableAmount: 32000,
    liveBatchesCount: 3,
    kycDocs: ['https://s3.amazonaws.com/divine-docs/aadhaar_ramesh.jpg', 'https://s3.amazonaws.com/divine-docs/pan_ramesh.jpg'],
    withdrawalHistory: [
      { amount: 15000, requestedAt: new Date('2026-05-10'), status: 'Approved', transactionId: 'TXN-WDR-8801' },
      { amount: 8000, requestedAt: new Date('2026-05-18'), status: 'Pending', transactionId: '' }
    ],
    batches: [
      { batchName: 'Vedic Foundations A', scheduleTime: 'Mon, Wed, Fri - 7:00 PM', subject: 'Vedic Astrology', studentsCount: 15 },
      { batchName: 'Vedic Advanced B', scheduleTime: 'Sat, Sun - 9:00 AM', subject: 'Kundli Analysis', studentsCount: 12 }
    ]
  },
  { 
    teacherId: 'TCH-002', 
    name: 'Priya Sharma', 
    email: 'priya.tarot@astroadvyc.com',
    phone: '9876543210',
    expertise: 'Tarot Reading', 
    experience: '5 Yrs', 
    about: 'Intuitive tarot reader, crystal healer, and spiritual coach helping souls align with their highest path.',
    status: 'Pending', 
    rating: 0,
    kycStatus: 'Pending',
    certificates: ['https://s3.amazonaws.com/divine-docs/tarot_master_certified.pdf'],
    totalEarnings: 0,
    withdrawableAmount: 0,
    liveBatchesCount: 0,
    kycDocs: ['https://s3.amazonaws.com/divine-docs/aadhaar_priya.jpg'],
    withdrawalHistory: [],
    batches: []
  },
  { 
    teacherId: 'TCH-003', 
    name: 'Acharya Amit', 
    email: 'acharya.amit@astroadvyc.com',
    phone: '9988776655',
    expertise: 'Palmistry', 
    experience: '10 Yrs', 
    about: 'Expert palmist and face reader, specializing in detailed life roadmap mapping and elementary energy alignment.',
    status: 'Verified', 
    rating: 4.9,
    kycStatus: 'Completed',
    certificates: ['https://s3.amazonaws.com/divine-docs/palmistry_diploma.pdf'],
    totalEarnings: 54000,
    withdrawableAmount: 18000,
    liveBatchesCount: 2,
    kycDocs: ['https://s3.amazonaws.com/divine-docs/aadhaar_amit.jpg', 'https://s3.amazonaws.com/divine-docs/pan_amit.jpg'],
    withdrawalHistory: [
      { amount: 10000, requestedAt: new Date('2026-05-12'), status: 'Approved', transactionId: 'TXN-WDR-8802' }
    ],
    batches: [
      { batchName: 'Palmistry Core A', scheduleTime: 'Sat, Sun - 11:00 AM', subject: 'Palmistry', studentsCount: 8 }
    ]
  },
  { 
    teacherId: 'TCH-004', 
    name: 'Neha Vastu', 
    email: 'neha.vastu@astroadvyc.com',
    phone: '9122334455',
    expertise: 'Vastu Shastra', 
    experience: '8 Yrs', 
    about: 'Corporate Vastu consultant specializing in office layout alignments and energy positivity.',
    status: 'Pending', 
    rating: 0,
    kycStatus: 'Completed',
    certificates: ['https://s3.amazonaws.com/divine-docs/vastu_acharya_certificate.pdf'],
    totalEarnings: 0,
    withdrawableAmount: 0,
    liveBatchesCount: 0,
    kycDocs: ['https://s3.amazonaws.com/divine-docs/aadhaar_neha.jpg'],
    withdrawalHistory: [],
    batches: []
  },
  { 
    teacherId: 'TCH-005', 
    name: 'Guru Kripa', 
    email: 'guru.kripa@astroadvyc.com',
    phone: '9555666777',
    expertise: 'Numerology', 
    experience: '20 Yrs', 
    about: 'Ancient Numerologist focusing on name vibrations, corporate branding numbers, and lucky dates analysis.',
    status: 'Rejected', 
    rating: 0,
    kycStatus: 'Failed',
    certificates: ['https://s3.amazonaws.com/divine-docs/scam_docs.pdf'],
    totalEarnings: 0,
    withdrawableAmount: 0,
    liveBatchesCount: 0,
    kycDocs: ['https://s3.amazonaws.com/divine-docs/fake_id.jpg'],
    withdrawalHistory: [],
    batches: []
  }
];

const mockNGOs = [
  { 
    ngoId: 'NGO-001', 
    name: 'Pratham Education Foundation', 
    registrationNumber: 'REG-12345', 
    contactPerson: 'Amit Kumar', 
    email: 'contact@pratham.org', 
    phone: '011-2345678',
    about: 'Pratham is one of the largest non-governmental organizations in India, focusing on high-quality education for underprivileged children.',
    status: 'Verified',
    verifiedCampaignsCount: 2,
    activityProof: ['https://s3.amazonaws.com/divine-docs/kids_reading_proof.jpg', 'https://s3.amazonaws.com/divine-docs/distribution_report_2026.pdf'],
    payoutHistory: [
      { payoutId: 'PO-901', amount: 45000, status: 'Approved', requestedDate: new Date('2026-05-15') }
    ],
    kycDocs: ['https://s3.amazonaws.com/divine-docs/ngo_pratham_reg.pdf', 'https://s3.amazonaws.com/divine-docs/ngo_pratham_tax.pdf'],
    campaigns: [
      { campaignId: 'CMP-102', title: 'Education for 10 Girls', goal: '₹1,00,000', raised: '₹80,000', status: 'Live' }
    ]
  },
  { 
    ngoId: 'NGO-002', 
    name: 'Krishnayan Gaushala', 
    registrationNumber: 'REG-67890', 
    contactPerson: 'Swami Ji', 
    email: 'info@krishnayan.org', 
    phone: '9988998899',
    about: 'Dedicated cow sanctuary protecting abandoned, sick, and stray street cows. Feeding fresh gausharan daily.',
    status: 'Verified',
    verifiedCampaignsCount: 1,
    activityProof: ['https://s3.amazonaws.com/divine-docs/gaushala_cows_feed.jpg'],
    payoutHistory: [
      { payoutId: 'PO-902', amount: 50000, status: 'Approved', requestedDate: new Date('2026-05-20') }
    ],
    kycDocs: ['https://s3.amazonaws.com/divine-docs/gaushala_trust_deed.pdf'],
    campaigns: [
      { campaignId: 'CMP-103', title: 'Gaugrass Fodder Request', goal: '₹50,000', raised: '₹50,000', status: 'Completed' }
    ]
  },
  { 
    ngoId: 'NGO-003', 
    name: 'Hope Foundation', 
    registrationNumber: 'REG-54321', 
    contactPerson: 'Neha Singh', 
    email: 'hello@hopengo.in', 
    phone: '8877665544',
    about: 'Providing emergency winter blankets, clothing kits, and disaster relief aid to the most vulnerable.',
    status: 'Pending',
    verifiedCampaignsCount: 1,
    activityProof: [],
    payoutHistory: [],
    kycDocs: ['https://s3.amazonaws.com/divine-docs/hope_ngo_cert.pdf'],
    campaigns: [
      { campaignId: 'CMP-105', title: 'Winter Clothes Distribution', goal: '₹75,000', raised: '₹25,000', status: 'Live' }
    ]
  },
  { 
    ngoId: 'NGO-004', 
    name: 'Green Earth', 
    registrationNumber: 'REG-98765', 
    contactPerson: 'Rohan Sharma', 
    email: 'support@greenearth.org', 
    phone: '7766554433',
    about: 'Global afforestation initiative carrying out city green belt developments and local environmental checkups.',
    status: 'Pending',
    verifiedCampaignsCount: 0,
    activityProof: [],
    payoutHistory: [],
    kycDocs: ['https://s3.amazonaws.com/divine-docs/green_earth_reg.pdf'],
    campaigns: []
  },
  { 
    ngoId: 'NGO-005', 
    name: 'Fraudulent NGO', 
    registrationNumber: 'REG-00000', 
    contactPerson: 'Unknown', 
    email: 'scam@fakengo.com', 
    phone: '0000000000',
    about: 'Fake registration attempting double-billing and scamming on social causes.',
    status: 'Rejected',
    verifiedCampaignsCount: 0,
    activityProof: [],
    payoutHistory: [],
    kycDocs: ['https://s3.amazonaws.com/divine-docs/fake_ngo_doc.pdf'],
    campaigns: []
  }
];

const mockDonors = [
  { 
    donorId: 'DNR-901', 
    name: 'Ravi Teja', 
    email: 'ravi.t@example.com', 
    phone: '9888877777',
    totalDonated: '₹45,000', 
    campaignsSupported: 3, 
    status: 'Active',
    donationHistory: [
      { campaignTitle: 'Help for Heart Surgery', amount: '₹15,000', type: 'One-Time', date: new Date('2026-05-10') },
      { campaignTitle: 'Education for 10 Girls', amount: '₹10,000', type: 'Monthly', date: new Date('2026-05-15') },
      { campaignTitle: 'Gaugrass Fodder Request', amount: '₹20,000', type: 'One-Time', date: new Date('2026-05-20') }
    ]
  },
  { 
    donorId: 'DNR-902', 
    name: 'Ayesha Khan', 
    email: 'ayesha.k@example.com', 
    phone: '9777766666',
    totalDonated: '₹12,500', 
    campaignsSupported: 1, 
    status: 'Active',
    donationHistory: [
      { campaignTitle: 'Winter Clothes Distribution', amount: '₹12,500', type: 'One-Time', date: new Date('2026-05-12') }
    ]
  },
  { 
    donorId: 'DNR-903', 
    name: 'Anil Kapoor', 
    email: 'anil.k@example.com', 
    phone: '9666655555',
    totalDonated: '₹1,50,000', 
    campaignsSupported: 5, 
    status: 'Active',
    donationHistory: [
      { campaignTitle: 'Help for Heart Surgery', amount: '₹50,000', type: 'One-Time', date: new Date('2026-05-18') },
      { campaignTitle: 'Education for 10 Girls', amount: '₹40,000', type: 'Monthly', date: new Date('2026-05-22') }
    ]
  },
  { 
    donorId: 'DNR-904', 
    name: 'Sneha Reddy', 
    email: 'sneha.r@example.com', 
    phone: '9555544444',
    totalDonated: '₹5,000', 
    campaignsSupported: 1, 
    status: 'Suspended',
    donationHistory: [
      { campaignTitle: 'Medical emergency - Accident', amount: '₹5,000', type: 'One-Time', date: new Date('2026-05-14') }
    ]
  },
];

const mockAdmin = [
  { email: 'admin@astroadvyc.com', password: 'password123' }
];

const mockStudents = [
  { 
    studentId: 'STU-001', 
    name: 'Rohit Verma', 
    email: 'rohit@example.com', 
    phone: '9876543210', 
    courseEnrolled: 'Vedic Astrology Masterclass', 
    marks: 85, 
    testStatus: 'Passed', 
    scholarshipStatus: 'Approved', 
    scholarshipAmount: '₹2,500', 
    referredBy: 'Anil Kapoor', 
    status: 'Active',
    attendanceRate: 95,
    certificatesEarned: ['https://s3.amazonaws.com/divine-docs/vedic_astrology_rohit.pdf'],
    assignmentsSubmitted: [
      { assignmentTitle: 'Natal Chart Mapping Assignment', score: 88, submittedAt: new Date('2026-05-10') }
    ],
    testsCompleted: [
      { testTitle: 'Entrance Vedic Test', score: 85, completedAt: new Date('2026-05-08') }
    ],
    subscriptionPlan: 'Premium Yearly',
    pdfDownloads: [
      { title: 'Vedic Houses Cheat-Sheet', downloadedAt: new Date('2026-05-11') },
      { title: 'Shani Transit Remedies Guide', downloadedAt: new Date('2026-05-19') }
    ],
    batchDiscussions: [
      { roomName: 'Vedic Foundations A Discussion', joinedAt: new Date('2026-05-01') }
    ]
  },
  { 
    studentId: 'STU-002', 
    name: 'Karan Malhotra', 
    email: 'karan@example.com', 
    phone: '8765432109', 
    courseEnrolled: 'Tarot for Beginners', 
    marks: 45, 
    testStatus: 'Failed', 
    scholarshipStatus: 'None', 
    scholarshipAmount: '₹0', 
    referredBy: '', 
    status: 'Active',
    attendanceRate: 70,
    certificatesEarned: [],
    assignmentsSubmitted: [
      { assignmentTitle: 'Minor Arcana Meaning', score: 50, submittedAt: new Date('2026-05-12') }
    ],
    testsCompleted: [
      { testTitle: 'Basic Tarot Quiz', score: 45, completedAt: new Date('2026-05-09') }
    ],
    subscriptionPlan: 'Basic Monthly',
    pdfDownloads: [],
    batchDiscussions: [
      { roomName: 'Tarot Beginners Circle', joinedAt: new Date('2026-05-09') }
    ]
  },
  { 
    studentId: 'STU-003', 
    name: 'Simran Jeet', 
    email: 'simran@example.com', 
    phone: '7654321098', 
    courseEnrolled: 'Advanced Palmistry', 
    marks: 92, 
    testStatus: 'Passed', 
    scholarshipStatus: 'Applied', 
    scholarshipAmount: '₹0', 
    referredBy: 'Ravi Teja', 
    status: 'Active',
    attendanceRate: 98,
    certificatesEarned: [],
    assignmentsSubmitted: [
      { assignmentTitle: 'Deciphering Life Line Marks', score: 95, submittedAt: new Date('2026-05-14') }
    ],
    testsCompleted: [
      { testTitle: 'Entrance Palmistry Quiz', score: 92, completedAt: new Date('2026-05-10') }
    ],
    subscriptionPlan: 'Course Purchase',
    pdfDownloads: [
      { title: 'Main Palm Lines Handbook', downloadedAt: new Date('2026-05-15') }
    ],
    batchDiscussions: [
      { roomName: 'Palmistry Core Discussion', joinedAt: new Date('2026-05-10') }
    ]
  },
  { 
    studentId: 'STU-004', 
    name: 'Aditi Rao', 
    email: 'aditi@example.com', 
    phone: '6543210987', 
    courseEnrolled: 'Vedic Astrology Masterclass', 
    marks: 60, 
    testStatus: 'Passed', 
    scholarshipStatus: 'Rejected', 
    scholarshipAmount: '₹0', 
    referredBy: '', 
    status: 'Suspended',
    attendanceRate: 50,
    certificatesEarned: [],
    assignmentsSubmitted: [],
    testsCompleted: [
      { testTitle: 'Entrance Vedic Test', score: 60, completedAt: new Date('2026-05-05') }
    ],
    subscriptionPlan: 'None',
    pdfDownloads: [],
    batchDiscussions: []
  }
];

// Spanned over 30 days to build comprehensive MIS revenue and donation data
const today = new Date();
const daysAgo = (num) => {
  const d = new Date();
  d.setDate(today.getDate() - num);
  return d;
};

const mockTransactions = [
  { transactionId: 'TXN-001', type: 'Donation', user: 'Anil Kapoor', item: 'Help for Heart Surgery', amount: 50000, paymentPlan: 'None', status: 'Success', date: daysAgo(1) },
  { transactionId: 'TXN-002', type: 'Course', user: 'Rohit Verma', item: 'Vedic Astrology Masterclass', amount: 4999, paymentPlan: 'EMI - 50% Advance', status: 'Success', date: daysAgo(2) },
  { transactionId: 'TXN-003', type: 'Seminar', user: 'Shalini Sen', item: 'Vastu & Positivity Workshop', amount: 999, paymentPlan: 'Full Payment', status: 'Success', date: daysAgo(3) },
  { transactionId: 'TXN-004', type: 'Donation', user: 'Ravi Teja', item: 'Education for 10 Girls', amount: 15000, paymentPlan: 'None', status: 'Success', date: daysAgo(5) },
  { transactionId: 'TXN-005', type: 'Course', user: 'Simran Jeet', item: 'Advanced Palmistry', amount: 3999, paymentPlan: 'Full Payment', status: 'Success', date: daysAgo(8) },
  { transactionId: 'TXN-006', type: 'Donation', user: 'Ayesha Khan', item: 'Winter Clothes Distribution', amount: 8000, paymentPlan: 'None', status: 'Success', date: daysAgo(12) },
  { transactionId: 'TXN-007', type: 'Course', user: 'Karan Malhotra', item: 'Tarot for Beginners', amount: 2499, paymentPlan: 'Full Payment', status: 'Success', date: daysAgo(15) },
  { transactionId: 'TXN-008', type: 'Donation', user: 'Anil Kapoor', item: 'Education for 10 Girls', amount: 40000, paymentPlan: 'None', status: 'Success', date: daysAgo(18) },
  { transactionId: 'TXN-009', type: 'Seminar', user: 'Vijay Kumar', item: 'Vastu & Positivity Workshop', amount: 999, paymentPlan: 'Full Payment', status: 'Success', date: daysAgo(22) },
  { transactionId: 'TXN-010', type: 'Course', user: 'Rohit Verma', item: 'Vedic Astrology Masterclass', amount: 2499, paymentPlan: 'EMI - Completed', status: 'Success', date: daysAgo(25) },
  { transactionId: 'TXN-011', type: 'Donation', user: 'Ravi Teja', item: 'Winter Clothes Distribution', amount: 12000, paymentPlan: 'None', status: 'Success', date: daysAgo(28) },
  { transactionId: 'TXN-012', type: 'Course', user: 'Simran Jeet', item: 'Vedic Astrology Masterclass', amount: 4999, paymentPlan: 'Full Payment', status: 'Failed', date: daysAgo(4) },
];

const mockReviews = [
  { reviewId: 'REV-001', userName: 'Rohit Verma', userRole: 'Student', type: 'Teacher', targetName: 'Dr. Ramesh Jyotish', rating: 5, comment: 'Dr. Ramesh is an absolute genius in Vedic Astrology. His methods are extremely clear!', status: 'Approved' },
  { reviewId: 'REV-002', userName: 'Karan Malhotra', userRole: 'Student', type: 'Course', targetName: 'Tarot for Beginners', rating: 4, comment: 'Excellent course, though I wish there were more interactive live sessions.', status: 'Approved' },
  { reviewId: 'REV-003', userName: 'Anonymous Donor', userRole: 'Donor', type: 'Campaign', targetName: 'Education for 10 Girls', rating: 5, comment: 'Very transparent process and happy to see children studying. Highly recommend supporting!', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', status: 'Approved' },
  { reviewId: 'REV-004', userName: 'Kriti Sen', userRole: 'User', type: 'General', targetName: 'Astroadvyc Platform', rating: 5, comment: 'Amazing user interface and great selection of spiritual coaching.', videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4', status: 'Pending' },
  { reviewId: 'REV-005', userName: 'Spammer User', userRole: 'User', type: 'Teacher', targetName: 'Acharya Amit', rating: 1, comment: 'This is fake and terrible advertisement. Buy my cryptocurrency coin now!', status: 'Pending' }
];

const mockPosts = [
  { postId: 'PST-001', title: 'Understanding Shani Sade Sati', type: 'Blog', content: 'Saturn transit, commonly referred to as Sade Sati, lasts for seven and a half years in an individual’s life. In this post, we explain how to navigate this period with grace and Vastu remedies...', author: 'Dr. Ramesh Jyotish', category: 'Astrology', reportsCount: 0, status: 'Active' },
  { postId: 'PST-002', title: 'Top 5 Tarot Spreads for Beginners', type: 'Video', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', author: 'Priya Sharma', category: 'Tarot', reportsCount: 1, status: 'Active' },
  { postId: 'PST-003', title: 'Why Vastu is essential for your new office', type: 'Blog', content: 'Implementing elementary Vastu Shastra rules like seating orientation and element placement can skyrocket productivity and bring harmonious revenue to your workspace...', author: 'Neha Vastu', category: 'Vastu', reportsCount: 5, status: 'Flagged' },
];

const mockCategories = [
  { categoryId: 'CAT-001', name: 'Vedic Astrology', description: 'Covers horoscope charting, planets transit, and houses analysis.', coursesCount: 2 },
  { categoryId: 'CAT-002', name: 'Tarot Reading', description: 'Covers major and minor arcana deck combinations and readings.', coursesCount: 1 },
  { categoryId: 'CAT-003', name: 'Palmistry', description: 'Covers main hand lines (Life, Heart, Head) and mounts.', coursesCount: 1 },
  { categoryId: 'CAT-004', name: 'Vastu Shastra', description: 'Home layout mapping and elemental balance directions.', coursesCount: 0 },
  { categoryId: 'CAT-005', name: 'Numerology', description: 'Covers life path numbers and vibration alignments.', coursesCount: 0 },
];

const mockBanners = [
  { bannerId: 'BNR-001', title: '50% Discount on Vedic Astrology Masterclass', imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&q=80&w=1200', linkUrl: '/courses', placement: 'Courses', status: 'Active' },
  { bannerId: 'BNR-002', title: 'Support Sharda Girls School Education Campaign', imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1200', linkUrl: '/campaigns', placement: 'Campaigns', status: 'Active' },
  { bannerId: 'BNR-003', title: 'Join our free Vastu Seminar this Saturday!', imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200', linkUrl: '/seminars', placement: 'Home', status: 'Active' }
];

const mockNewsMedia = [
  { newsId: 'NWS-001', title: 'Divine Admin launches Astro-Coaching Scholarship program', source: 'Times of India', content: 'The Divine spiritual coaching network has launched its state of the art scholarship program. Students who score above 80% on their entrance tests will get direct monthly fee waivers up to 50%.', status: 'Published', publishedDate: daysAgo(3) },
  { newsId: 'NWS-002', title: 'Spiritual tech systems see 120% surge in rural regions', source: 'Economic Times', content: 'Astrology and spiritual coaching platforms are seeing unprecedented subscription rates from tier-3 cities, showing high interest in local certified experts.', status: 'Published', publishedDate: daysAgo(10) }
];

const mockSeminars = [
  { seminarId: 'SEM-001', title: 'Vastu & Positivity Workshop', instructor: 'Neha Vastu', date: '2026-05-30', time: '11:00 AM', price: 999, approvalStatus: 'Approved', paymentStatus: 'Paid' },
  { seminarId: 'SEM-002', title: 'Vedic Charting Secrets', instructor: 'Dr. Ramesh Jyotish', date: '2026-06-05', time: '04:00 PM', price: 1499, approvalStatus: 'Pending', paymentStatus: 'Unpaid' },
  { seminarId: 'SEM-003', title: 'Numerology & Names Vibration', instructor: 'Guru Kripa', date: '2026-06-10', time: '02:00 PM', price: 499, approvalStatus: 'Pending', paymentStatus: 'Paid' }
];

const mockReferrals = [
  { referralId: 'REF-001', referrerName: 'Anil Kapoor', referredUserName: 'Rohit Verma', rewardAmount: 500, status: 'Completed' },
  { referralId: 'REF-002', referrerName: 'Ravi Teja', referredUserName: 'Simran Jeet', rewardAmount: 500, status: 'Pending' }
];

async function seedDatabase() {
  console.log('Clearing old data from DB...');
  await Campaign.deleteMany({});
  await Teacher.deleteMany({});
  await Course.deleteMany({});
  await NGO.deleteMany({});
  await Donor.deleteMany({});
  await Admin.deleteMany({});
  await Student.deleteMany({});
  await Transaction.deleteMany({});
  await Review.deleteMany({});
  await Post.deleteMany({});
  await SubjectCategory.deleteMany({});
  await Banner.deleteMany({});
  await NewsMedia.deleteMany({});
  await Seminar.deleteMany({});
  await Referral.deleteMany({});
  
  console.log('Inserting seed data...');
  await Campaign.insertMany(mockCampaigns);
  await Teacher.insertMany(mockTeachers);
  await Course.insertMany(mockCourses);
  await NGO.insertMany(mockNGOs);
  await Donor.insertMany(mockDonors);
  await Admin.insertMany(mockAdmin);
  await Student.insertMany(mockStudents);
  await Transaction.insertMany(mockTransactions);
  await Review.insertMany(mockReviews);
  await Post.insertMany(mockPosts);
  await SubjectCategory.insertMany(mockCategories);
  await Banner.insertMany(mockBanners);
  await NewsMedia.insertMany(mockNewsMedia);
  await Seminar.insertMany(mockSeminars);
  await Referral.insertMany(mockReferrals);
  
  console.log('Database seeded successfully with all Divine features!');
}

module.exports = { seedDatabase };
