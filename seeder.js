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
  { campaignId: 'CMP-101', title: 'Help for Heart Surgery', user: 'Rahul Sharma', goal: '₹5,00,000', raised: '₹2,45,000', status: 'Pending' },
  { campaignId: 'CMP-102', title: 'Education for 10 Girls', user: 'NGO Pratham', goal: '₹1,00,000', raised: '₹80,000', status: 'Live' },
  { campaignId: 'CMP-103', title: 'Gaugrass Fodder Request', user: 'Krishnayan Gaushala', goal: '₹50,000', raised: '₹50,000', status: 'Completed' },
  { campaignId: 'CMP-104', title: 'Medical emergency - Accident', user: 'Sneha Verma', goal: '₹2,00,000', raised: '₹10,000', status: 'Pending' },
  { campaignId: 'CMP-105', title: 'Winter Clothes Distribution', user: 'Hope NGO', goal: '₹75,000', raised: '₹25,000', status: 'Live' },
];

const mockCourses = [
  { courseId: 'CRS-201', title: 'Vedic Astrology Masterclass', instructor: 'Dr. Ramesh Jyotish', price: '₹4,999', duration: '30 Hrs', status: 'Published' },
  { courseId: 'CRS-202', title: 'Tarot for Beginners', instructor: 'Priya Sharma', price: '₹2,499', duration: '15 Hrs', status: 'Pending' },
  { courseId: 'CRS-203', title: 'Advanced Palmistry', instructor: 'Acharya Amit', price: '₹3,999', duration: '20 Hrs', status: 'Published' },
];

const mockTeachers = [
  { teacherId: 'TCH-001', name: 'Dr. Ramesh Jyotish', expertise: 'Vedic Astrology', experience: '15 Yrs', status: 'Verified', rating: 4.8 },
  { teacherId: 'TCH-002', name: 'Priya Sharma', expertise: 'Tarot Reading', experience: '5 Yrs', status: 'Pending', rating: 0 },
  { teacherId: 'TCH-003', name: 'Acharya Amit', expertise: 'Palmistry', experience: '10 Yrs', status: 'Verified', rating: 4.9 },
  { teacherId: 'TCH-004', name: 'Neha Vastu', expertise: 'Vastu Shastra', experience: '8 Yrs', status: 'Pending', rating: 0 },
  { teacherId: 'TCH-005', name: 'Guru Kripa', expertise: 'Numerology', experience: '20 Yrs', status: 'Rejected', rating: 0 },
];

const mockNGOs = [
  { ngoId: 'NGO-001', name: 'Pratham Education Foundation', registrationNumber: 'REG-12345', contactPerson: 'Amit Kumar', email: 'contact@pratham.org', status: 'Verified' },
  { ngoId: 'NGO-002', name: 'Krishnayan Gaushala', registrationNumber: 'REG-67890', contactPerson: 'Swami Ji', email: 'info@krishnayan.org', status: 'Verified' },
  { ngoId: 'NGO-003', name: 'Hope Foundation', registrationNumber: 'REG-54321', contactPerson: 'Neha Singh', email: 'hello@hopengo.in', status: 'Pending' },
  { ngoId: 'NGO-004', name: 'Green Earth', registrationNumber: 'REG-98765', contactPerson: 'Rohan Sharma', email: 'support@greenearth.org', status: 'Pending' },
  { ngoId: 'NGO-005', name: 'Fraudulent NGO', registrationNumber: 'REG-00000', contactPerson: 'Unknown', email: 'scam@fakengo.com', status: 'Rejected' },
];

const mockDonors = [
  { donorId: 'DNR-901', name: 'Ravi Teja', email: 'ravi.t@example.com', totalDonated: '₹45,000', campaignsSupported: 3, status: 'Active' },
  { donorId: 'DNR-902', name: 'Ayesha Khan', email: 'ayesha.k@example.com', totalDonated: '₹12,500', campaignsSupported: 1, status: 'Active' },
  { donorId: 'DNR-903', name: 'Anil Kapoor', email: 'anil.k@example.com', totalDonated: '₹1,50,000', campaignsSupported: 5, status: 'Active' },
  { donorId: 'DNR-904', name: 'Sneha Reddy', email: 'sneha.r@example.com', totalDonated: '₹5,000', campaignsSupported: 1, status: 'Suspended' },
];

const mockAdmin = [
  { email: 'admin@astroadvyc.com', password: 'password123' }
];

const mockStudents = [
  { studentId: 'STU-001', name: 'Rohit Verma', email: 'rohit@example.com', phone: '9876543210', courseEnrolled: 'Vedic Astrology Masterclass', marks: 85, testStatus: 'Passed', scholarshipStatus: 'Approved', scholarshipAmount: '₹2,500', referredBy: 'Anil Kapoor', status: 'Active' },
  { studentId: 'STU-002', name: 'Karan Malhotra', email: 'karan@example.com', phone: '8765432109', courseEnrolled: 'Tarot for Beginners', marks: 45, testStatus: 'Failed', scholarshipStatus: 'None', scholarshipAmount: '₹0', referredBy: '', status: 'Active' },
  { studentId: 'STU-003', name: 'Simran Jeet', email: 'simran@example.com', phone: '7654321098', courseEnrolled: 'Advanced Palmistry', marks: 92, testStatus: 'Passed', scholarshipStatus: 'Applied', scholarshipAmount: '₹0', referredBy: 'Ravi Teja', status: 'Active' },
  { studentId: 'STU-004', name: 'Aditi Rao', email: 'aditi@example.com', phone: '6543210987', courseEnrolled: 'Vedic Astrology Masterclass', marks: 60, testStatus: 'Passed', scholarshipStatus: 'Rejected', scholarshipAmount: '₹0', referredBy: '', status: 'Suspended' }
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
