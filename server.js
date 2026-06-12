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
app.use(express.json());

// Routes
const campaignRoutes = require('./routes/campaigns');
const teacherRoutes = require('./routes/teachers');
const courseRoutes = require('./routes/courses');
const ngoRoutes = require('./routes/ngos');
const donorRoutes = require('./routes/donors');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const campaignCategoryRoutes = require('./routes/campaignCategories');
const studentRoutes = require('./routes/students');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
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

// Root route welcome/health check landing dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Secured Routes (Require JWT Bearer Token)
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/teachers', authMiddleware, teacherRoutes);
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/ngos', authMiddleware, ngoRoutes);
app.use('/api/donors', authMiddleware, donorRoutes);
app.use('/api/students', authMiddleware, studentRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/reviews', authMiddleware, reviewRoutes);
app.use('/api/posts', authMiddleware, postRoutes);
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/banners', authMiddleware, bannerRoutes);
app.use('/api/news', authMiddleware, newsRoutes);
app.use('/api/seminars', authMiddleware, seminarRoutes);
app.use('/api/referrals', authMiddleware, referralRoutes);

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
