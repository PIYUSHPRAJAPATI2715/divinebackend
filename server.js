const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./db');

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
const studentRoutes = require('./routes/students');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const postRoutes = require('./routes/posts');
const categoryRoutes = require('./routes/categories');
const bannerRoutes = require('./routes/banners');
const newsRoutes = require('./routes/news');
const seminarRoutes = require('./routes/seminars');
const referralRoutes = require('./routes/referrals');

app.use('/api/campaigns', campaignRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/auth', authRoutes);

// Root route welcome/health check
app.get('/', (req, res) => {
  res.json({
    message: "Divine Backend API is successfully running!",
    status: "online",
    endpoints: {
      campaigns: "/api/campaigns",
      teachers: "/api/teachers",
      courses: "/api/courses",
      ngos: "/api/ngos",
      donors: "/api/donors",
      auth: "/api/auth"
    }
  });
});
app.use('/api/students', studentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/seminars', seminarRoutes);
app.use('/api/referrals', referralRoutes);

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
