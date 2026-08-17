const mongoose = require('mongoose');
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
const User = require('./models/User');
const CampaignCategory = require('./models/CampaignCategory');
const Coupon = require('./models/Coupon');
const Notification = require('./models/Notification');
const SupportTicket = require('./models/SupportTicket');
const Content = require('./models/Content');
const DanCategory = require('./models/DanCategory');
const DanSubcategory = require('./models/DanSubcategory');
const DanItem = require('./models/DanItem');
const DanDonation = require('./models/DanDonation');
const WalletSettings = require('./models/WalletSettings');

const noahId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7a');
const prathamId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7b');
const krishnayanId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7c');

const mockCampaigns = [
  { 
    campaignId: 'CMP-RURAL', 
    title: 'Rural education Initiative', 
    user: 'Save the Children', 
    category: 'Books',
    description: 'Providing school supplies, uniform kits, and study books for 50 unprivileged children in rural villages.',
    goal: '75,000', 
    raised: '54,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Live',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600',
    donorsCount: 1300,
    daysLeft: 12,
    verificationDocs: [],
    withdrawalRequested: false,
    withdrawalStatus: 'None',
    withdrawalRequests: []
  },
  { 
    campaignId: 'CMP-TEMPLE', 
    title: 'Ancient Temple Carving Restorations', 
    user: 'Vedic Heritage Trust', 
    category: 'Temple',
    description: 'Renovate and restore ancient stone carvings and structures of historic heritage temples in South India.',
    goal: '2,50,000', 
    raised: '1,25,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Live',
    imageUrl: 'https://images.unsplash.com/photo-1600100397990-a4a8ec90966a?auto=format&fit=crop&q=80&w=600',
    donorsCount: 850,
    daysLeft: 25,
    verificationDocs: [],
    withdrawalRequested: false,
    withdrawalStatus: 'None',
    withdrawalRequests: []
  },
  { 
    campaignId: 'CMP-102', 
    title: 'Education for 10 Girls', 
    user: 'Save the Children', 
    category: 'Books',
    description: 'Sponsor dynamic elementary schooling, tuition fees, uniforms, and study books for 10 unprivileged girl students in urban slum areas of New Delhi.',
    goal: '1,00,000', 
    raised: '80,000', 
    oneTimeOrMonthly: 'Monthly',
    status: 'Live',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600',
    donorsCount: 450,
    daysLeft: 18,
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
    user: 'Gau Seva Trust', 
    category: 'Gau Seva',
    description: 'Support pure fodder (gausharan grass) distribution for over 200 abandoned indigenous cows at Haridwar gaushala.',
    goal: '50,000', 
    raised: '50,000', 
    oneTimeOrMonthly: 'One-Time',
    status: 'Completed',
    imageUrl: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=600',
    donorsCount: 200,
    daysLeft: 0,
    verificationDocs: ['https://s3.amazonaws.com/divine-docs/gaushala_trust_deed.pdf'],
    withdrawalRequested: true,
    withdrawalStatus: 'Approved',
    withdrawalRequests: [
      { amount: 50000, requestedAt: new Date('2026-05-20'), status: 'Approved', releasedAt: new Date('2026-05-21') }
    ]
  },
  { 
    campaignId: 'CMP-105', 
    title: 'Winter Clothes Distribution', 
    user: 'Hope Foundation', 
    category: 'Food',
    description: 'Help us distribute warm winter blankets, high-quality sweaters, and shoes to thousands of homeless families sleeping on Delhi streets.',
    goal: '75,000', 
    raised: '25,000', 
    oneTimeOrMonthly: 'Both',
    status: 'Live',
    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=600',
    donorsCount: 120,
    daysLeft: 8,
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
    _id: prathamId,
    ngoId: 'NGO-001', 
    name: 'Pratham Education Foundation', 
    registrationNumber: 'REG-12345', 
    contactPerson: 'Amit Kumar', 
    email: 'save@children.org', 
    phone: '+91 8888811111',
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
    _id: krishnayanId,
    ngoId: 'NGO-002', 
    name: 'Krishnayan Gaushala', 
    registrationNumber: 'REG-67890', 
    contactPerson: 'Swami Ji', 
    email: 'seva@gaushala.org', 
    phone: '+91 8888833333', 
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
    name: 'Green Earth Foundation', 
    registrationNumber: 'REG-98765', 
    contactPerson: 'Rohan Sharma', 
    email: 'contact@greenearth.org', 
    phone: '+91 8888822222',
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

const adminId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c79');

const mockAdmin = [
  { _id: adminId, email: 'admin@astroadvyc.com', password: 'password123' }
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

const mockCampaignCategories = [
  {
    categoryId: 'CAT-TEMP',
    name: 'Temple',
    icon: '🛕',
    imageUrl: 'https://images.unsplash.com/photo-1600100397990-a4a8ec90966a?auto=format&fit=crop&q=80&w=600',
    description: 'Ancient Temple restoration and religious offerings support.'
  },
  {
    categoryId: 'CAT-BOOK',
    name: 'Books',
    icon: '📚',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
    description: 'Sponsor education, stationery, and schooling programs.'
  },
  {
    categoryId: 'CAT-FOOD',
    name: 'Food',
    icon: '🍱',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600',
    description: 'Provide hot meals and dry ration packs to needy families.'
  },
  {
    categoryId: 'CAT-COW',
    name: 'Gau Seva',
    icon: '🐄',
    imageUrl: 'https://images.unsplash.com/photo-1570051008600-b34bac49e7f1?auto=format&fit=crop&q=80&w=600',
    description: 'Cow protection sanctuaries and green grass fodder support.'
  },
  {
    categoryId: 'CAT-MED',
    name: 'Medical',
    icon: '🏥',
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=600',
    description: 'Emergency medical treatment and surgery support for the underprivileged.'
  },
  {
    categoryId: 'CAT-GIRL',
    name: 'Girl Education',
    icon: '👩‍🎓',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600',
    description: 'Empower girls through education, scholarships, and skill development.'
  },
  {
    categoryId: 'CAT-FLOOD',
    name: 'Disaster Relief',
    icon: '🌊',
    imageUrl: 'https://images.unsplash.com/photo-1617575521317-d2974f3b56d2?auto=format&fit=crop&q=80&w=600',
    description: 'Flood, earthquake, and disaster relief camps and rehabilitation.'
  },
  {
    categoryId: 'CAT-ENV',
    name: 'Environment',
    icon: '🌱',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&q=80&w=600',
    description: 'Tree plantation, river cleanup, and eco-restoration initiatives.'
  }
];

const mockUsers = [
  {
    _id: noahId,
    phone: '+91 9999999999',
    role: 'student',
    name: 'Noah',
    email: 'noah@example.com',
    gender: 'Male',
    walletBalance: 100,
    isProfileComplete: true
  },
  {
    phone: '+91 8888811111',
    role: 'ngo',
    name: 'Pratham Education Foundation',
    email: 'save@children.org',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 8888822222',
    role: 'ngo',
    name: 'Green Earth Foundation',
    email: 'contact@greenearth.org',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 8888833333',
    role: 'ngo',
    name: 'Krishnayan Gaushala',
    email: 'seva@gaushala.org',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 9812345678',
    role: 'teacher',
    name: 'Dr. Ramesh Jyotish',
    email: 'ramesh.jyotish@astroadvyc.com',
    gender: 'Male',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 9876543210',
    role: 'teacher',
    name: 'Priya Sharma',
    email: 'priya.tarot@astroadvyc.com',
    gender: 'Female',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 9988776655',
    role: 'teacher',
    name: 'Acharya Amit',
    email: 'acharya.amit@astroadvyc.com',
    gender: 'Male',
    isProfileComplete: true,
    verified: true
  },
  {
    phone: '+91 9122334455',
    role: 'teacher',
    name: 'Neha Vastu',
    email: 'neha.vastu@astroadvyc.com',
    gender: 'Female',
    isProfileComplete: true,
    verified: true
  }
];

const mockTransactions = [
  { transactionId: 'TXN-H1', type: 'Donation', user: 'Noah', item: 'Gau Seva Trust', amount: 70, paymentPlan: 'None', status: 'Success', date: new Date(Date.now() - 12 * 60 * 1000) },
  { transactionId: 'TXN-H2', type: 'Donation', user: 'Noah', item: 'Save the Children', amount: 150, paymentPlan: 'None', status: 'Success', date: daysAgo(1) },
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
  { transactionId: 'TXN-9871', type: 'Donation', user: 'Rahul Sharma', item: 'Dan: Ration Kit For Needy Family - 30days (x2), Feed Brahmins And Saints (x4)', amount: 1200, paymentPlan: 'None', status: 'Success', date: new Date('2026-06-20') },
  { transactionId: 'TXN-9872', type: 'Donation', user: 'Anjali Verma', item: 'Dan: Ration Kit For Needy Family - 60days (x1)', amount: 600, paymentPlan: 'None', status: 'Success', date: new Date('2026-06-24') }
];

const mockReviews = [
  { reviewId: 'REV-001', userName: 'Rohit Verma', userRole: 'Student', type: 'Teacher', targetName: 'Dr. Ramesh Jyotish', rating: 5, comment: 'Dr. Ramesh is an absolute genius in Vedic Astrology. His methods are extremely clear!', status: 'Approved' },
  { reviewId: 'REV-002', userName: 'Karan Malhotra', userRole: 'Student', type: 'Course', targetName: 'Tarot for Beginners', rating: 4, comment: 'Excellent course, though I wish there were more interactive live sessions.', status: 'Approved' },
  { reviewId: 'REV-003', userName: 'Anonymous Donor', userRole: 'Donor', type: 'Campaign', targetName: 'Education for 10 Girls', rating: 5, comment: 'Very transparent process and happy to see children studying. Highly recommend supporting!', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', status: 'Approved' },
  { reviewId: 'REV-004', userName: 'Kriti Sen', userRole: 'User', type: 'General', targetName: 'Astroadvyc Platform', rating: 5, comment: 'Amazing user interface and great selection of spiritual coaching.', videoUrl: 'https://media.w3.org/2010/05/sintel/trailer_hd.mp4', status: 'Pending' },
  { reviewId: 'REV-005', userName: 'Spammer User', userRole: 'User', type: 'Teacher', targetName: 'Acharya Amit', rating: 1, comment: 'This is fake and terrible advertisement. Buy my cryptocurrency coin now!', status: 'Pending' },
  { reviewId: 'REV-H1', userName: 'Noah', userRole: 'Donor', type: 'Campaign', targetName: 'Save the Children', rating: 5, comment: 'Incredible work by the team. Very happy with the impact reports shared!', status: 'Approved' },
  // NGO-type reviews (these power the /api/ngo/profile reviewCount, reviews list, and rating)
  { reviewId: 'REV-NGO-001', userName: 'Anil Sharma', userRole: 'Donor', type: 'NGO', targetName: 'Pratham Education Foundation', rating: 5, comment: 'Pratham does incredible work for underprivileged children. The transparency in fund usage is commendable!', status: 'Approved' },
  { reviewId: 'REV-NGO-002', userName: 'Sunita Mehra', userRole: 'Donor', type: 'NGO', targetName: 'Pratham Education Foundation', rating: 4, comment: 'Great NGO, very responsive team. Impact reports are shared regularly which builds trust.', status: 'Approved' },
  { reviewId: 'REV-NGO-003', userName: 'Ravi Kumar', userRole: 'Donor', type: 'NGO', targetName: 'Pratham Education Foundation', rating: 5, comment: 'One of the most trustworthy NGOs I have donated to. Highly recommend!', status: 'Approved' },
  { reviewId: 'REV-NGO-004', userName: 'Meena Joshi', userRole: 'Donor', type: 'NGO', targetName: 'Save the Children India', rating: 5, comment: 'Save the Children does outstanding work. Their programs really make a difference at the grassroot level.', status: 'Approved' },
  { reviewId: 'REV-NGO-005', userName: 'Deepak Nair', userRole: 'Donor', type: 'NGO', targetName: 'Save the Children India', rating: 4, comment: 'I have been donating here for 2 years. Very professional and impactful organization.', status: 'Approved' },
  { reviewId: 'REV-NGO-006', userName: 'Priya Gupta', userRole: 'Donor', type: 'NGO', targetName: 'Karan mart', rating: 4, comment: 'Good organization with clear objectives. Keep up the great work!', status: 'Approved' },
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
  {
    bannerId: 'BNR-HM-TOP',
    title: 'Every Contribution Creates an Impact',
    subtitle: 'Support verified causes across India',
    location: 'home_top',
    placement: 'home_top',
    page: 'Home Page',
    position: 'Top',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/campaigns',
    targetRoute: '/campaigns',
    status: 'Active',
    subscriptionPlan: 'Premium Sponsor'
  },
  {
    bannerId: 'BNR-HM-BOT',
    title: 'Join Our Divine Seva Community & Change Lives Today',
    subtitle: '100% verified transparent giving',
    location: 'home_bottom',
    placement: 'home_bottom',
    page: 'Home Page',
    position: 'Bottom',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/donate',
    targetRoute: '/donate',
    status: 'Active',
    subscriptionPlan: 'Featured'
  },
  {
    bannerId: 'BNR-DNT-TOP',
    title: 'Donate & Support Sacred Causes Directly',
    subtitle: 'Direct wall-to-wall relief funds',
    location: 'donate_home_top',
    placement: 'donate_home_top',
    page: 'Donate Home Page',
    position: 'Top',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1544427928-c49cddeb8b92?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1544427928-c49cddeb8b92?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/donate',
    targetRoute: '/donate',
    status: 'Active',
    subscriptionPlan: 'Monthly Partner'
  },
  {
    bannerId: 'BNR-DAN-TOP',
    title: 'Sponsor Daily Annadanam & Vedic Seva Items',
    subtitle: 'Select from certified daan items',
    location: 'daan_category_top',
    placement: 'daan_category_top',
    page: 'Select Daan Category',
    position: 'Top',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/daan-category',
    targetRoute: '/daan-category',
    status: 'Active',
    subscriptionPlan: 'Standard'
  },
  {
    bannerId: 'BNR-DAN-BOT',
    title: 'Every Act of Giving Creates a Ripple of Hope',
    subtitle: 'Join hands with verified gaushalas and orphanages',
    location: 'daan_category_bottom',
    placement: 'daan_category_bottom',
    page: 'Select Daan Category',
    position: 'Bottom',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/daan-category',
    targetRoute: '/daan-category',
    status: 'Active',
    subscriptionPlan: 'Standard'
  },
  {
    bannerId: 'BNR-CMP-TOP',
    title: 'Explore Ongoing Verified Campaigns Across India',
    subtitle: 'Emergency medical, education & temple heritage causes',
    location: 'campaign_list_top',
    placement: 'campaign_list_top',
    page: 'Campaign List Page',
    position: 'Top',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/campaigns',
    targetRoute: '/campaigns',
    status: 'Active',
    subscriptionPlan: 'Featured'
  },
  {
    bannerId: 'BNR-FLW-TOP',
    title: 'Stay Connected With Your Favorite Verified NGOs',
    subtitle: 'Follow NGO updates and track real-time impact',
    location: 'following_list_top',
    placement: 'following_list_top',
    page: 'Following List Page',
    position: 'Top',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/following',
    targetRoute: '/following',
    status: 'Active',
    subscriptionPlan: 'Standard'
  },
  {
    bannerId: 'BNR-DTL-BOT',
    title: 'Empower This Cause - Share & Donate Today',
    subtitle: 'Your support helps us reach 100% campaign target faster',
    location: 'campaign_details_bottom',
    placement: 'campaign_details_bottom',
    page: 'Campaign Details Page',
    position: 'Bottom',
    mediaType: 'image',
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200',
    mediaUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=1200',
    linkUrl: '/campaigns',
    targetRoute: '/campaigns',
    status: 'Active',
    subscriptionPlan: 'Premium Sponsor'
  }
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
  { referralId: 'REF-002', referrerName: 'Ravi Teja', referredUserName: 'Simran Jeet', rewardAmount: 500, status: 'Pending' },
  { referralId: 'REF-H1', referrerName: 'Noah', referredUserName: 'Rahul Sharma', rewardAmount: 100, status: 'Completed' },
  { referralId: 'REF-H2', referrerName: 'Noah', referredUserName: 'Amit Kumar', rewardAmount: 100, status: 'Pending' }
];

const mockCoupons = [
  {
    code: 'WELCOME100',
    description: 'Get ₹100 cashback bonus inside your wallet on your first transaction.',
    discountType: 'Flat',
    value: 100,
    expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    code: 'FESTIVE50',
    description: 'Claim 50% discount booster on ASTRO courses.',
    discountType: 'Percentage',
    value: 50,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    code: 'CHARITY20',
    description: 'Unlock 20% discount coupon on spiritual courses catalog.',
    discountType: 'Percentage',
    value: 20,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true
  }
];

const mockNotifications = [
  {
    user: noahId,
    title: 'Welcome to Divine Astrological Portal!',
    message: 'Thank you for registering. You can browse NGOs, start fundraising campaigns, or book a spiritual service.',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=150',
    isRead: false
  },
  {
    user: noahId,
    title: 'Wallet Activated',
    message: 'Your dynamic charity wallet is activated. Check reward coupons tab to claim ₹100 cashback bonus.',
    imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=150',
    isRead: false
  },
  {
    user: noahId,
    title: 'Profile Completed',
    message: 'Your profile has been verified. Welcome to our donor community!',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=150',
    isRead: true
  }
];

const mockSupportTickets = [
  {
    ticketId: 'TCK-1001',
    user: noahId,
    userName: 'Noah',
    userPhone: '9999999999',
    subject: 'Wallet top-up failed',
    message: 'My wallet top-up failed but the amount was deducted from my bank account. Please check.',
    status: 'Resolved',
    reply: 'Your payment was successfully settled and credited to your wallet balance. Please check your transaction history.',
    repliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    ticketId: 'TCK-1002',
    user: noahId,
    userName: 'Noah',
    userPhone: '9999999999',
    subject: 'Tax exemption certificate',
    message: 'Where can I download the 80G tax exemption receipt for my donation to Save the Children?',
    status: 'Open',
    reply: ''
  }
];

const mockContent = [
  {
    key: 'privacy',
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: `### 1. Information Collection\nWe collect details you provide directly like phone number, email, and name. Transactions made via your wallet are safely ledgered.\n\n### 2. Sponsoring Protection\nAll donations made on Divine Nakshatra go through verified 12A/80G NGOs to prevent misuse.\n\n### 3. Account Safety\nYou can deactivate or delete your account at any time. Doing so disables your wallet and hides your profile.`
  },
  {
    key: 'terms',
    slug: 'terms-conditions',
    title: 'Terms & Conditions',
    content: `### 1. Sponsoring Ledger\nBy topup or donating, you agree that transactions are settlements made on verified social campaigns.\n\n### 2. Astrological Courses\nTeachers are independent partners. Review course details, schedules, and curriculum before booking.\n\n### 3. Code of Conduct\nAbuse, falsified campaign setups, and offensive review comments will result in instant account suspension.`
  },
  {
    key: 'about',
    slug: 'about-us',
    title: 'About Us',
    content: `### Sponsoring Astrological and Social Changes\nDivine Nakshatra blends ancient Vedic wisdom with modern social impact. We connect verified astrologers with students, and donors with local NGOs.\n\n### Our Mission\nTo foster an ecosystem of learning, charity, and transparency, powered by dynamic real-time reporting ledgers.`
  }
];

const catFoodId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7d');
const catClothesId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7e');
const catGauId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c7f');
const catNgoId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c80');
const catBooksId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c81');
const catTempleId = new mongoose.Types.ObjectId('6671c22d1ce70b55582f0c82');


const subSaintsId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac1');
const subDryRationId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac2');
const subNeedyChildrenId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac3');
const subBlanketId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac4');
const subKidClothesId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac5');
const subFodderId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac6');
const subCowMedId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac7');
const subReliefId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac8');
const subStationeryId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fac9');
const subTempleSevaId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6faca');

const itemRation30Id = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad1');
const itemFeedSaintsId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad2');
const itemRation60Id = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad3');
const itemBlanketId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad4');
const itemKidClothesId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad5');
const itemFodderId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad6');
const itemCowMedId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad7');
const itemReliefId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad8');
const itemStationeryId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fad9');
const itemTempleSevaId = new mongoose.Types.ObjectId('6a79e3b0231053b51fb6fada');

const mockDanCategories = [
  { _id: catFoodId, categoryId: 'CAT-FOOD', name: 'Food', description: 'Food for the needy', imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' },
  { _id: catClothesId, categoryId: 'CAT-CLOTHES', name: 'Clothes', description: 'Clothes donation', imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' },
  { _id: catGauId, categoryId: 'CAT-GAU', name: 'Gau Dan', description: 'Donation for cows', imageUrl: 'https://images.unsplash.com/photo-1570051008600-b34bac49e7f1?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' },
  { _id: catNgoId, categoryId: 'CAT-NGO', name: 'NGO Welfare', description: 'Support NGOs', imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' },
  { _id: catBooksId, categoryId: 'CAT-BOOKS', name: 'Books', description: 'Education support', imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' },
  { _id: catTempleId, categoryId: 'CAT-TEMPLE', name: 'Temple', description: 'Temple donation', imageUrl: 'https://images.unsplash.com/photo-1600100397990-a4a8ec90966a?auto=format&fit=crop&q=80&w=600', status: 'Active', creatorType: 'Admin' }
];

const mockDanSubcategories = [
  // Food Category
  { _id: subSaintsId, subcategoryId: 'SUB-SAINTS', categoryId: catFoodId, name: 'Saints & Brahmins Seva', description: 'Sponsor those who dedicate their lives to dharma and spiritual guidance.', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  { _id: subDryRationId, subcategoryId: 'SUB-DRY-RATION', categoryId: catFoodId, name: 'Dry Ration', description: 'Ration kits containing rice, dal, wheat flour, oil, and spices.', status: 'Active', creatorType: 'Admin' },
  { _id: subNeedyChildrenId, subcategoryId: 'SUB-CHILDREN', categoryId: catFoodId, name: 'Support Needy Children', description: 'Support education and meals for street children.', status: 'Active', creatorType: 'NGO', ngoId: prathamId },
  
  // Clothes Category
  { _id: subBlanketId, subcategoryId: 'SUB-BLANKETS', categoryId: catClothesId, name: 'Winter Blankets & Sweaters', description: 'Provide warm winter blankets and woolens to the homeless.', status: 'Active', creatorType: 'Admin' },
  { _id: subKidClothesId, subcategoryId: 'SUB-KID-CLOTHES', categoryId: catClothesId, name: 'Children Clothing Sets', description: 'Fresh cotton clothes and uniforms for underprivileged children.', status: 'Active', creatorType: 'NGO', ngoId: prathamId },
  
  // Gau Dan Category
  { _id: subFodderId, subcategoryId: 'SUB-FODDER', categoryId: catGauId, name: 'Green Grass & Fodder', description: 'Nourishing green fodder for gaushala cows.', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  { _id: subCowMedId, subcategoryId: 'SUB-COW-MED', categoryId: catGauId, name: 'Cow Medical & Gaushala Care', description: 'Veterinary care, medicines, and shelter for injured cows.', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  
  // NGO Welfare Category
  { _id: subReliefId, subcategoryId: 'SUB-RELIEF', categoryId: catNgoId, name: 'Emergency Relief & Welfare', description: 'Emergency funds for disaster recovery and grassroots welfare.', status: 'Active', creatorType: 'Admin' },
  
  // Books Category
  { _id: subStationeryId, subcategoryId: 'SUB-STATIONERY', categoryId: catBooksId, name: 'School Notebooks & Stationery', description: 'Notebooks, pens, school bags, and educational kits for students.', status: 'Active', creatorType: 'NGO', ngoId: prathamId },
  
  // Temple Category
  { _id: subTempleSevaId, subcategoryId: 'SUB-TEMPLE-SEVA', categoryId: catTempleId, name: 'Temple Annakshetra & Puja Seva', description: 'Sponsor daily temple prasadam meals and puja oil offerings.', status: 'Active', creatorType: 'Admin' }
];

const mockDanItems = [
  // Food Items
  { _id: itemRation30Id, itemId: 'ITM-RATION-30', subcategoryId: subDryRationId, name: 'Ration Kit For Needy Family - 30days', description: 'Provide basic dry ration supply for a family of 4 to survive 30 days.', price: 300, unit: '1 Ration Kit', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  { _id: itemFeedSaintsId, itemId: 'ITM-FEED-SAINTS', subcategoryId: subSaintsId, name: 'Feed Brahmins And Saints', description: 'Sponsor hot, nutritious cooked meals for Vedic scholars and saints.', price: 150, unit: '1 Saint Meal', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  { _id: itemRation60Id, itemId: 'ITM-RATION-60', subcategoryId: subDryRationId, name: 'Ration Kit For Needy Family - 60days', description: 'Provide basic dry ration supply for a family of 4 to survive 60 days.', price: 600, unit: '1 Ration Kit', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  
  // Clothes Items
  { _id: itemBlanketId, itemId: 'ITM-BLANKET', subcategoryId: subBlanketId, name: 'Warm Winter Blanket', description: 'Distribute heavy warm wool blanket to outdoor pavement dwellers during peak winter.', price: 250, unit: '1 Blanket', status: 'Active', creatorType: 'Admin' },
  { _id: itemKidClothesId, itemId: 'ITM-KID-CLOTHES', subcategoryId: subKidClothesId, name: 'Child Cotton Clothing Set', description: 'Fresh pair of shirts, trousers/dresses for orphan children.', price: 350, unit: '1 Dress Set', status: 'Active', creatorType: 'NGO', ngoId: prathamId },
  
  // Gau Dan Items
  { _id: itemFodderId, itemId: 'ITM-FODDER', subcategoryId: subFodderId, name: '1 Quintal Green Grass Fodder', description: 'Feed 10 cows fresh green grass fodder for a full day.', price: 500, unit: '1 Quintal Fodder', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  { _id: itemCowMedId, itemId: 'ITM-COW-MED', subcategoryId: subCowMedId, name: 'Cow Medical Care & Vaccine Kit', description: 'Provide medical treatment and health checkup for non-milking cows.', price: 350, unit: '1 Treatment Kit', status: 'Active', creatorType: 'NGO', ngoId: krishnayanId },
  
  // NGO Welfare Items
  { _id: itemReliefId, itemId: 'ITM-RELIEF', subcategoryId: subReliefId, name: 'Emergency Disaster Relief Pack', description: 'Provide emergency water, dry food, and first aid kits to disaster affected families.', price: 750, unit: '1 Relief Pack', status: 'Active', creatorType: 'Admin' },
  
  // Books Items
  { _id: itemStationeryId, itemId: 'ITM-STATIONERY', subcategoryId: subStationeryId, name: 'Complete Student Stationery Kit', description: 'Includes 6 notebooks, geometry box, pens, pencils, and school bag.', price: 200, unit: '1 Kit', status: 'Active', creatorType: 'NGO', ngoId: prathamId },
  
  // Temple Items
  { _id: itemTempleSevaId, itemId: 'ITM-TEMPLE-SEVA', subcategoryId: subTempleSevaId, name: 'Annakshetra Prasadam Sponsoring', description: 'Sponsor fresh consecrated temple prasadam meals for 25 devotees.', price: 500, unit: '25 Meal Pack', status: 'Active', creatorType: 'Admin' }
];

const mockDanDonations = [
  {
    donationId: 'DON-9871',
    donorName: 'Rahul Sharma',
    donorPhone: '+91 9876543210',
    donorEmail: 'rahul.sharma@example.com',
    items: [
      {
        itemId: itemRation30Id,
        name: 'Ration Kit For Needy Family - 30days',
        price: 300,
        quantity: 2,
        subtotal: 600
      },
      {
        itemId: itemFeedSaintsId,
        name: 'Feed Brahmins And Saints',
        price: 150,
        quantity: 4,
        subtotal: 600
      }
    ],
    totalAmount: 1200,
    frequency: 'One-Time',
    eventType: 'Birthday',
    eventName: 'Rahul Birthday Seva',
    eventDate: new Date('2026-06-20'),
    paymentMethod: 'UPI',
    paymentStatus: 'Success',
    ngoId: krishnayanId,
    transactionId: 'TXN-9871',
    createdAt: new Date('2026-06-20T10:00:00Z'),
    updatedAt: new Date('2026-06-20T10:05:00Z')
  },
  {
    donationId: 'DON-9872',
    donorName: 'Anjali Verma',
    donorPhone: '+91 9811223344',
    donorEmail: 'anjali@example.com',
    items: [
      {
        itemId: itemRation60Id,
        name: 'Ration Kit For Needy Family - 60days',
        price: 600,
        quantity: 1,
        subtotal: 600
      }
    ],
    totalAmount: 600,
    frequency: 'Monthly',
    eventType: 'Others',
    eventName: '',
    paymentMethod: 'Card',
    paymentStatus: 'Success',
    ngoId: krishnayanId,
    transactionId: 'TXN-9872',
    createdAt: new Date('2026-06-24T14:30:00Z'),
    updatedAt: new Date('2026-06-24T14:32:00Z')
  }
];

async function seedDatabase() {
  console.log('Clearing old data from DB...');
  await DanCategory.deleteMany({});
  await DanSubcategory.deleteMany({});
  await DanItem.deleteMany({});
  await DanDonation.deleteMany({});

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
  await User.deleteMany({});
  await CampaignCategory.deleteMany({});
  await Coupon.deleteMany({});
  await Notification.deleteMany({});
  await SupportTicket.deleteMany({});
  await Content.deleteMany({});
  
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
  await User.insertMany(mockUsers);
  await CampaignCategory.insertMany(mockCampaignCategories);
  await Coupon.insertMany(mockCoupons);
  await Notification.insertMany(mockNotifications);
  await SupportTicket.insertMany(mockSupportTickets);
  await Content.insertMany(mockContent);
  
  await DanCategory.insertMany(mockDanCategories);
  await DanSubcategory.insertMany(mockDanSubcategories);
  await DanItem.insertMany(mockDanItems);
  await DanDonation.insertMany(mockDanDonations);

  await WalletSettings.deleteMany({});
  await WalletSettings.create({
    settingsId: 'GLOBAL_SETTINGS',
    coinsPerRupee: 10,
    coinRedeemLotSize: 2500,
    cashbackExpiryDays: 15,
    cashbackMaxRedeemPercent: 20,
    predefinedRechargeTiers: [
      { tierId: 'TIER-100', amount: 100, cashback: 10, bonusCoins: 100, badgeText: '', description: 'Recharge ₹100 & get ₹10 Cashback + 100 Coins', isActive: true },
      { tierId: 'TIER-500', amount: 500, cashback: 50, bonusCoins: 500, badgeText: 'Popular', description: 'Recharge ₹500 & get ₹50 Cashback + 500 Coins', isActive: true },
      { tierId: 'TIER-1000', amount: 1000, cashback: 150, bonusCoins: 1000, badgeText: 'Best Value', description: 'Recharge ₹1,000 & get ₹150 Cashback + 1,000 Coins', isActive: true },
      { tierId: 'TIER-2000', amount: 2000, cashback: 400, bonusCoins: 2500, badgeText: 'Super Saver', description: 'Recharge ₹2,000 & get ₹400 Cashback + 2,500 Coins', isActive: true },
      { tierId: 'TIER-5000', amount: 5000, cashback: 1200, bonusCoins: 5000, badgeText: 'Mega Booster', description: 'Recharge ₹5,000 & get ₹1,200 Cashback + 5,000 Coins', isActive: true }
    ]
  });
  
  console.log('Database seeded successfully with all Divine features!');
}

module.exports = { seedDatabase };
