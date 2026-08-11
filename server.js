const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const { connectDB } = require('./db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Public Postman collection file endpoint for 1-click URL import
app.get('/postman_collection.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'postman_collection.json'));
});
app.get('/api/postman_collection.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'postman_collection.json'));
});

// Public File Upload endpoint (decodes base64, saves as physical file, returns public URL)
app.post('/api/upload', (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ status: false, message: 'Image base64 data is required' });
    }

    let base64Data = image;
    let ext = 'png';
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        base64Data = matches[2];
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/${filename}`;

    res.json({ status: true, imageUrl });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Routes
const campaignRoutes = require('./routes/campaigns');
const teacherRoutes = require('./routes/teachers');
const courseRoutes = require('./routes/courses');
const ngoRoutes = require('./routes/ngos');
const adminDonorRoutes = require('./routes/admin/donors');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const campaignCategoryRoutes = require('./routes/campaignCategories');
const studentRoutes = require('./routes/students');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const adminReviewRoutes = require('./routes/admin/reviews');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const bannerRoutes = require('./routes/banners');
const newsRoutes = require('./routes/news');
const seminarRoutes = require('./routes/seminars');
const referralRoutes = require('./routes/referrals');

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/campaign-categories', campaignCategoryRoutes);
app.use('/api/dan', require('./routes/dan'));

// Partner Portal Routes (Protected by JWT Auth)
const ngoPortalRoutes = require('./routes/ngo');
const teacherPortalRoutes = require('./routes/teacher');
const donorPortalRoutes = require('./routes/donor');
const adminDonorPortalRoutes = require('./routes/admin/donor');

app.use('/api/ngo', authMiddleware, ngoPortalRoutes);
app.use('/api/teacher', authMiddleware, teacherPortalRoutes);
app.use('/api/donor', authMiddleware, donorPortalRoutes);
app.use('/api/admin/donor-help', authMiddleware, adminDonorPortalRoutes);
app.use('/api/admin/donor', authMiddleware, adminDonorPortalRoutes);

// System Seeding Route
const { seedDatabase } = require('./seeder');
app.post('/api/system/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ status: true, message: 'Database successfully seeded with dynamic homepage elements!' });
  } catch (err) {
    res.status(500).json({ status: false, message: 'Seeding failed: ' + err.message });
  }
});

// GET seeding endpoint for easy execution via browser
app.get('/api/system/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.send('<h1>Database seeded successfully!</h1><p>You can now test the Daan/Dan flow APIs and interfaces.</p><p><a href="/">Go to Home</a></p>');
  } catch (err) {
    res.status(500).send('<h1>Seeding failed</h1><p>' + err.message + '</p>');
  }
});

// Postman collection file serve route
app.get('/postman_collection.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'postman_collection.json'));
});

// Root route welcome/health check landing dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Admin Routes (Prefixed with /api/admin)
app.use('/api/admin/campaigns', authMiddleware, campaignRoutes);
app.use('/api/admin/teachers', authMiddleware, teacherRoutes);
app.use('/api/admin/courses', authMiddleware, courseRoutes);
app.use('/api/admin/ngos', authMiddleware, ngoRoutes);
app.use('/api/admin/donors', authMiddleware, adminDonorRoutes);
app.use('/api/admin/students', authMiddleware, studentRoutes);
app.use('/api/admin/transactions', authMiddleware, transactionRoutes);
app.use('/api/admin/reviews', authMiddleware, adminReviewRoutes);
app.use('/api/admin/posts', authMiddleware, postRoutes);
app.use('/api/admin/categories', authMiddleware, categoryRoutes);
app.use('/api/admin/banners', authMiddleware, bannerRoutes);
app.use('/api/admin/news', authMiddleware, newsRoutes);
app.use('/api/admin/seminars', authMiddleware, seminarRoutes);
app.use('/api/admin/referrals', authMiddleware, referralRoutes);
app.use('/api/admin/campaign-categories', authMiddleware, campaignCategoryRoutes);

// Secured Legacy Routes (Without /api/admin prefix, for compatibility)
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/teachers', authMiddleware, teacherRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/ngos', authMiddleware, ngoRoutes);
app.use('/api/donors', authMiddleware, donorPortalRoutes);
app.use('/api/students', authMiddleware, studentRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/posts', authMiddleware, postRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/banners', authMiddleware, bannerRoutes);
app.use('/api/news', authMiddleware, newsRoutes);
app.use('/api/seminars', authMiddleware, seminarRoutes);
app.use('/api/referrals', authMiddleware, referralRoutes);
const socialRoutes = require('./routes/donor/social');
app.use('/api/social', authMiddleware, socialRoutes);
app.get('/api/followers', authMiddleware, socialRoutes.handleFollowers);
app.get('/api/following', authMiddleware, socialRoutes.handleFollowing);
app.get('/api/donor/followers', authMiddleware, socialRoutes.handleFollowers);
app.get('/api/donor/following', authMiddleware, socialRoutes.handleFollowing);
app.use('/api/follow', authMiddleware, socialRoutes);

// MongoDB Connection and Server Start
connectDB()
.then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
})
.catch((err) => {
  console.error('Error initializing application: ', err.message);
});
