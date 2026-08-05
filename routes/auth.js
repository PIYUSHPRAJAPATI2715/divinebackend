const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const NGO = require('../models/NGO');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Donor = require('../models/Donor');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

/**
 * @route   POST /api/auth/check-role
 * @desc    Get the registered role of a phone number
 * @access  Public
 */
router.post('/check-role', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ status: false, message: 'Phone number is required' });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.json({ status: true, isUserExist: false, role: null });
    }
    res.json({ status: true, isUserExist: user.isProfileComplete, role: user.role });
  } catch (err) {
    console.error('Check role error:', err);
    res.status(400).json({ status: false, message: err.message || 'Check role failed' });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    Initiate signup by phone & role, check if exists, send OTP
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ status: false, message: 'Phone number is required' });
    }
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      existingUser.otp = '1234';
      existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await existingUser.save();
      return res.json({
        status: true,
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isUserExist: existingUser.isProfileComplete,
        phone,
        role: existingUser.role,
        otp: '1234'
      });
    }
    const newUser = new User({
      phone,
      role: 'donor',
      isProfileComplete: false,
      otp: '1234',
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
    });
    await newUser.save();
    res.json({
      status: true,
      message: 'OTP sent successfully (Use static code 1234 to verify)',
      isUserExist: false,
      phone,
      role: 'donor',
      otp: '1234'
    });
  } catch (err) {
    console.error('Signup initiation error:', err);
    res.status(400).json({ status: false, message: err.message || 'Signup initiation failed' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate admin by email/pass OR initiate user login by phone
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    if (phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        existingUser.otp = '1234';
        existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await existingUser.save();
        return res.json({
          status: true,
          message: 'OTP sent successfully (Use static code 1234 to verify)',
          isUserExist: existingUser.isProfileComplete,
          phone,
          role: existingUser.role,
          otp: '1234'
        });
      }
      const newUser = new User({
        phone,
        role: 'donor',
        isProfileComplete: false,
        otp: '1234',
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
      });
      await newUser.save();
      return res.json({
        status: true,
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isUserExist: false,
        phone,
        role: 'donor',
        otp: '1234'
      });
    }
    if (email && password) {
      const admin = await Admin.findOne({ email });
      if (admin) {
        const isPlainMatch = admin.password === password;
        let isHashMatch = false;
        if (!isPlainMatch && admin.password.startsWith('$2')) {
          isHashMatch = await bcrypt.compare(password, admin.password);
        }
        if (isPlainMatch || isHashMatch) {
          const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
          return res.json({
            status: true,
            message: 'Login successful',
            token,
            data: { id: admin._id, email: admin.email, role: 'admin' }
          });
        }
      }
      return res.status(401).json({ status: false, message: 'Invalid admin credentials' });
    }
    return res.status(400).json({ status: false, message: 'Please provide either a phone number or admin credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ status: false, message: err.message || 'Login failed' });
  }
});

/**
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
router.post('/resend-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ status: false, message: 'Phone number is required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ status: false, message: 'User session not found. Please initiate signup/login first.' });
    user.otp = '1234';
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    res.json({ status: true, message: 'OTP resent successfully (Use static code 1234 to verify)', phone: user.phone, role: user.role, otp: '1234' });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message || 'Resend OTP failed' });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ status: false, message: 'Phone number and OTP are required' });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ status: false, message: 'User session not found. Please request a new OTP.' });
    if (!user.otp || user.otp !== otp) return res.status(400).json({ status: false, message: 'Invalid OTP' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ status: false, message: 'OTP has expired. Please request a new OTP.' });
    user.otp = null;
    user.otpExpiry = null;
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, phone: user.phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      status: true,
      message: 'OTP verified successfully',
      token,
      isProfileComplete: user.isProfileComplete,
      data: {
        ...user.toObject(),
        verified: !!user.verified
      }
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message || 'OTP verification failed' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged-in user full profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const userObj = user.toObject();
    let enrichedExtra = {
      reviewCount: 0,
      reviews: [],
      impact: userObj.impactStats || '',
      impactStats: userObj.impactStats || '',
      followersCount: (userObj.followers || []).length,
      years: userObj.years || '',
      rating: 4.5
    };

    if (user.role === 'ngo') {
      const Review = require('../models/Review');
      const NGO = require('../models/NGO');
      
      const ngoName = user.organizationName || user.name || '';
      const ngo = await NGO.findOne({
        $or: [
          { email: user.email },
          { phone: user.phone },
          { name: { $regex: new RegExp(`^${ngoName}$`, 'i') } }
        ]
      });

      if (ngo) {
        let reviews = await Review.find({
          $or: [
            { targetName: { $regex: new RegExp(`^${ngo.name}$`, 'i') } },
            { type: 'NGO' }
          ],
          status: 'Approved'
        }).sort({ createdAt: -1 });

        if (reviews.length === 0) {
          reviews = await Review.find({ status: 'Approved' }).limit(5);
        }

        const followersList = await User.find({ followingNgos: ngo._id }).select('_id name phone profilePhoto email role');
        const followersCount = followersList.length;

        enrichedExtra = {
          ...ngo.toObject(),
          reviewCount: reviews.length,
          reviews: reviews.map(r => ({
            _id: r._id,
            reviewId: r.reviewId,
            userName: r.userName,
            userRole: r.userRole || 'Donor',
            type: r.type || 'NGO',
            targetName: r.targetName || ngo.name,
            rating: r.rating,
            comment: r.comment,
            videoUrl: r.videoUrl || '',
            status: r.status,
            createdAt: r.createdAt
          })),
          followersCount: followersCount,
          followers: followersList,
          followingCount: 0,
          impact: ngo.impactStats || 'Grassroots community empowerment and emergency relief.',
          impactStats: ngo.impactStats || 'Grassroots community empowerment and emergency relief.',
          years: ngo.years || '5 Years',
          rating: ngo.rating || 4.5,
          verified: true
        };
      }
    }

    res.json({
      status: true,
      data: {
        ...userObj,
        ...enrichedExtra,
        verified: !!user.verified
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update profile for both NGO and Donor (after registration)
 * @access  Private (requires JWT token)
 * @body    For Donor: { name, gender, profilePhoto, email }
 *          For NGO: { organizationName, email, registeredAddress, authorizedPerson,
 *                    designation, gender, logo, panNumber, tanNumber, gstNumber,
 *                    registration12A, registration80G, hasDarpan, darpanNumber,
 *                    hasCSR1, csr1Number, hasFCRA, fcraNumber,
 *                    bankAccountHolder, bankName, bankBranch, bankAccountNumber, bankIFSC,
 *                    about, impactStats }
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const { email } = req.body;

    // Email uniqueness check
    if (email && email !== user.email) {
      const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
      if (emailInUse) return res.status(400).json({ status: false, message: 'Email address is already in use by another account' });
      user.email = email;
    }

    if (user.role === 'ngo') {
      let ngo = await NGO.findOne({ email: user.email });
      if (!ngo) {
        ngo = new NGO({
          ngoId: `NGO-${Date.now().toString().slice(-4)}`,
          email: user.email,
          phone: user.phone,
          name: req.body.organizationName || user.name || 'My NGO',
          registrationNumber: 'Pending Incorporation',
          contactPerson: req.body.authorizedPerson || 'Lead Trustee'
        });
      }

      const {
        organizationName, registeredAddress, authorizedPerson,
        designation, gender, profilePhoto, logo, about, impactStats, ngoType,
        panNumber, panImage, tanNumber, tanImage,
        gstNumber, gstDocument, registration12A, certificate12A, registration80G, certificate80G,
        darpanNumber, darpanCertificate,
        bankAccountHolder, bankName, bankBranch, bankAccountNumber, bankIFSC
      } = req.body;

      if (organizationName !== undefined) ngo.name = organizationName;
      if (registeredAddress !== undefined) ngo.registeredAddress = registeredAddress;
      if (authorizedPerson !== undefined) ngo.contactPerson = authorizedPerson;
      if (about !== undefined) ngo.about = about;
      if (impactStats !== undefined) ngo.impactStats = impactStats;
      if (ngoType !== undefined) ngo.ngoType = ngoType;
      if (logo !== undefined) ngo.logo = logo;
      if (bankAccountHolder !== undefined) ngo.bankAccountHolder = bankAccountHolder;
      if (bankName !== undefined) ngo.bankName = bankName;
      if (bankBranch !== undefined) ngo.bankBranch = bankBranch;
      if (bankAccountNumber !== undefined) ngo.bankAccountNumber = bankAccountNumber;
      if (bankIFSC !== undefined) ngo.bankIFSC = bankIFSC.toUpperCase();
      if (panNumber !== undefined) ngo.panNumber = panNumber;
      if (panImage !== undefined) ngo.panImage = panImage;
      if (tanNumber !== undefined) ngo.tanNumber = tanNumber;
      if (tanImage !== undefined) ngo.tanImage = tanImage;
      if (gstNumber !== undefined) ngo.gstNumber = gstNumber;
      if (gstDocument !== undefined) ngo.gstDocument = gstDocument;
      if (registration12A !== undefined) ngo.registration12A = registration12A;
      if (certificate12A !== undefined) ngo.certificate12A = certificate12A;
      if (registration80G !== undefined) ngo.registration80G = registration80G;
      if (certificate80G !== undefined) ngo.certificate80G = certificate80G;
      if (darpanNumber !== undefined) ngo.darpanNumber = darpanNumber;
      if (darpanCertificate !== undefined) ngo.darpanCertificate = darpanCertificate;

      await ngo.save();

      if (organizationName !== undefined) user.name = organizationName;
      if (gender !== undefined) user.gender = gender;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    } else if (user.role === 'teacher') {
      let teacher = await Teacher.findOne({ email: user.email });
      if (!teacher) {
        teacher = new Teacher({
          teacherId: `TCH-${Date.now().toString().slice(-4)}`,
          email: user.email,
          phone: user.phone,
          name: user.name
        });
      }

      const { name, gender, profilePhoto, expertise, experience, about, bankAccountHolder, bankName, bankBranch, bankAccountNumber, bankIFSC } = req.body;
      if (name !== undefined) teacher.name = name;
      if (expertise !== undefined) teacher.expertise = expertise;
      if (experience !== undefined) teacher.experience = experience;
      if (about !== undefined) teacher.about = about;
      if (bankAccountHolder !== undefined) teacher.bankAccountHolder = bankAccountHolder;
      if (bankName !== undefined) teacher.bankName = bankName;
      if (bankBranch !== undefined) teacher.bankBranch = bankBranch;
      if (bankAccountNumber !== undefined) teacher.bankAccountNumber = bankAccountNumber;
      if (bankIFSC !== undefined) teacher.bankIFSC = bankIFSC.toUpperCase();
      await teacher.save();

      if (name !== undefined) user.name = name;
      if (gender !== undefined) user.gender = gender;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    } else if (user.role === 'student') {
      let student = await Student.findOne({ email: user.email });
      if (!student) {
        student = new Student({
          studentId: `STU-${Date.now().toString().slice(-4)}`,
          email: user.email,
          phone: user.phone,
          name: user.name,
          courseEnrolled: 'Vedic Astrology Masterclass'
        });
      }

      const { name, gender, profilePhoto, courseEnrolled } = req.body;
      if (name !== undefined) student.name = name;
      if (courseEnrolled !== undefined) student.courseEnrolled = courseEnrolled;
      await student.save();

      if (name !== undefined) user.name = name;
      if (gender !== undefined) user.gender = gender;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    } else if (user.role === 'donor') {
      let donor = await Donor.findOne({ email: user.email });
      if (!donor) {
        donor = new Donor({
          donorId: `DNR-${Date.now().toString().slice(-4)}`,
          email: user.email,
          phone: user.phone,
          name: user.name,
          totalDonated: '₹0',
          campaignsSupported: 0
        });
      }

      const { name, gender, profilePhoto } = req.body;
      if (name !== undefined) donor.name = name;
      await donor.save();

      if (name !== undefined) user.name = name;
      if (gender !== undefined) user.gender = gender;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    }

    await user.save();

    res.json({
      status: true,
      message: 'Profile updated successfully',
      data: {
        ...user.toObject(),
        verified: !!user.verified
      }
    });

  } catch (err) {
    console.error('Profile update error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ status: false, message: `This ${field} is already registered with another account.` });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(v => v.message).join(', ');
      return res.status(400).json({ status: false, message: messages });
    }
    res.status(500).json({ status: false, message: err.message || 'Profile update failed' });
  }
});

// Import models for wallet/donation operations
const Campaign = require('../models/Campaign');
const Transaction = require('../models/Transaction');

/**
 * @route   POST /api/auth/wallet/topup
 * @access  Private
 */
router.post('/wallet/topup', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid top-up amount' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save();
    const transactionId = `TXN-${Date.now().toString().slice(-6)}`;
    const newTx = new Transaction({
      transactionId, type: 'Donation', user: user.name || user.phone,
      mobile: user.phone || '', amount: Number(amount), status: 'Success',
      date: new Date(), item: 'Wallet Top-up'
    });
    await newTx.save();
    res.json({ status: true, message: 'Wallet topped up successfully', data: user });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

/**
 * @route   POST /api/auth/wallet/donate
 * @access  Private
 */
router.post('/wallet/donate', authMiddleware, async (req, res) => {
  try {
    const { campaignId, ngoId, amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ status: false, message: 'A positive donation amount is required' });
    }
    if (!campaignId && !ngoId) {
      return res.status(400).json({ status: false, message: 'Either campaignId or ngoId is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    if ((user.walletBalance || 0) < Number(amount)) {
      return res.status(400).json({ status: false, message: 'Insufficient wallet balance. Please top up.' });
    }

    user.walletBalance -= Number(amount);
    await user.save();

    const transactionId = `TXN-${Date.now().toString().slice(-6)}`;

    if (ngoId) {
      // 1. Direct NGO Donation Flow
      const NGO = require('../models/NGO');
      const DanDonation = require('../models/DanDonation');
      
      let ngo = await NGO.findById(ngoId).catch(() => null);
      if (!ngo) {
        ngo = await NGO.findOne({ ngoId });
      }
      if (!ngo) {
        return res.status(404).json({ status: false, message: 'NGO not found' });
      }

      // Log transaction
      const newTx = new Transaction({
        transactionId, type: 'Donation', user: user.name || user.phone,
        mobile: user.phone || '', amount: Number(amount), status: 'Success',
        date: new Date(), item: `Direct Donation to ${ngo.name}`
      });
      await newTx.save();

      // Create DanDonation
      const danDonation = new DanDonation({
        donationId: `DON-${Date.now().toString().slice(-6)}`,
        donorId: user._id,
        donorName: user.name || 'Anonymous Donor',
        donorPhone: user.phone || '',
        donorEmail: user.email || '',
        items: [{
          itemId: user._id, // use donorId as placeholder for direct donation item
          name: 'Direct Donation',
          price: Number(amount),
          quantity: 1,
          subtotal: Number(amount)
        }],
        totalAmount: Number(amount),
        paymentMethod: 'Wallet',
        paymentStatus: 'Success',
        ngoId: ngo._id,
        transactionId
      });
      await danDonation.save();

      return res.json({
        status: true,
        message: `Successfully donated ₹${amount} directly to "${ngo.name}"`,
        data: user,
        ngo,
        danDonation
      });
    } else {
      // 2. Campaign Donation Flow
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return res.status(404).json({ status: false, message: 'Fundraising campaign not found' });

      const currentRaised = Number(campaign.raised.replace(/[^0-9]/g, '')) || 0;
      campaign.raised = `₹${(currentRaised + Number(amount)).toLocaleString()}`;
      campaign.donorsCount = (campaign.donorsCount || 0) + 1;
      await campaign.save();

      // Sync to NGO's campaigns array if it belongs to an NGO
      try {
        const NGO = require('../models/NGO');
        const ngo = await NGO.findOne({ name: campaign.user });
        if (ngo) {
          const cmpIdx = ngo.campaigns.findIndex(c => c.campaignId === campaign.campaignId);
          if (cmpIdx !== -1) {
            ngo.campaigns[cmpIdx].raised = campaign.raised;
            await ngo.save();
          }
        }
      } catch (ngoErr) {
        console.error('Failed to sync donation to NGO campaigns array:', ngoErr.message);
      }

      const newTx = new Transaction({
        transactionId, type: 'Donation', user: user.name || user.phone,
        mobile: user.phone || '', amount: Number(amount), status: 'Success',
        date: new Date(), item: campaign.title
      });
      await newTx.save();

      return res.json({ status: true, message: `Successfully donated ₹${amount} to "${campaign.title}"`, data: user, campaign });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Registration handlers
const registerHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ status: false, message: 'Unauthorized access. Valid token is required.' });
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const { email, role, phone } = req.body;

    if (role) {
      if (['donor', 'ngo', 'teacher', 'student'].includes(role)) user.role = role;
      else return res.status(400).json({ status: false, message: 'Invalid role. Must be either "donor", "ngo", "teacher", or "student".' });
    }
    if (email) {
      const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
      if (emailInUse) return res.status(400).json({ status: false, message: 'Email address is already in use by another account' });
      user.email = email;
    }
    if (phone) {
      const phoneInUse = await User.findOne({ phone, _id: { $ne: userId } });
      if (phoneInUse) return res.status(400).json({ status: false, message: 'Phone number is already in use by another account' });
      user.phone = phone;
    }

    if (user.role === 'ngo') {
      const { organizationName, registeredAddress, authorizedPerson, designation, gender, profilePhoto } = req.body;
      if (!organizationName || !registeredAddress || !authorizedPerson || !designation) {
        return res.status(400).json({ status: false, message: 'Organization Name, Registered Address, Authorized Person name, and Designation are required for NGO registration.' });
      }
      user.name = organizationName;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
    } else if (user.role === 'teacher') {
      const { name, expertise, experience, gender, profilePhoto } = req.body;
      if (!name || !expertise || !experience) {
        return res.status(400).json({ status: false, message: 'Name, Expertise, and Experience are required for Teacher registration.' });
      }
      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
    } else {
      const { name, gender, profilePhoto } = req.body;
      if (!name) return res.status(400).json({ status: false, message: 'Name is required.' });
      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
    }

    user.isProfileComplete = true;
    await user.save();

    // ----------------------------------------------------
    // REAL-TIME MULTI-COLLECTION SYNC
    // ----------------------------------------------------
    const finalEmail = user.email || req.body.email || `${user.phone.replace(/[^0-9]/g, '')}@divine.com`;

    if (user.role === 'ngo') {
      let ngo = await NGO.findOne({ email: finalEmail });
      if (!ngo) {
        ngo = new NGO({
          ngoId: `NGO-${Date.now().toString().slice(-4)}`,
          name: req.body.organizationName || user.name || 'My NGO',
          email: finalEmail,
          phone: user.phone,
          registrationNumber: req.body.registrationNumber || 'Pending Incorporation',
          contactPerson: req.body.authorizedPerson || 'Lead Trustee',
          registeredAddress: req.body.registeredAddress || '',
          addressCertificate: req.body.addressCertificate || null,
          designation: req.body.designation || '',
          about: req.body.about || 'Dedicated social welfare trust.',
          ngoType: req.body.ngoType || 'Organization',
          logo: req.body.logo || user.profilePhoto,
          status: 'Pending',
          bankAccountHolder: req.body.bankAccountHolder || '',
          bankName: req.body.bankName || '',
          bankBranch: req.body.bankBranch || '',
          bankAccountNumber: req.body.bankAccountNumber || '',
          bankIFSC: req.body.bankIFSC || '',
          panNumber: req.body.panNumber || '',
          panImage: req.body.panImage || null,
          tanNumber: req.body.tanNumber || '',
          tanImage: req.body.tanImage || null,
          gstNumber: req.body.gstNumber || '',
          gstDocument: req.body.gstDocument || null,
          registration12A: req.body.registration12A || '',
          certificate12A: req.body.certificate12A || null,
          registration80G: req.body.registration80G || '',
          certificate80G: req.body.certificate80G || null,
          darpanNumber: req.body.darpanNumber || '',
          darpanCertificate: req.body.darpanCertificate || null
        });
        await ngo.save();
      }
    } else if (user.role === 'teacher') {
      let teacher = await Teacher.findOne({ email: finalEmail });
      if (!teacher) {
        teacher = new Teacher({
          teacherId: `TCH-${Date.now().toString().slice(-4)}`,
          name: user.name,
          email: finalEmail,
          phone: user.phone,
          expertise: req.body.expertise || 'Vedic Astrology',
          experience: req.body.experience || '5 Years',
          about: req.body.about || 'Instructor bio details.',
          status: 'Verified',
          kycStatus: 'Completed',
          totalEarnings: 0,
          withdrawableAmount: 0,
          liveBatchesCount: 0,
          bankAccountHolder: req.body.bankAccountHolder || '',
          bankName: req.body.bankName || '',
          bankBranch: req.body.bankBranch || '',
          bankAccountNumber: req.body.bankAccountNumber || '',
          bankIFSC: req.body.bankIFSC || ''
        });
        await teacher.save();
      }
    } else if (user.role === 'student') {
      let student = await Student.findOne({ email: finalEmail });
      if (!student) {
        student = new Student({
          studentId: `STU-${Date.now().toString().slice(-4)}`,
          name: user.name,
          email: finalEmail,
          phone: user.phone,
          courseEnrolled: 'Vedic Astrology Masterclass',
          marks: 0,
          testStatus: 'Pending',
          scholarshipStatus: user.scholarshipStatus || 'None',
          scholarshipAmount: '₹0',
          referredBy: '',
          status: 'Active',
          attendanceRate: 100,
          subscriptionPlan: 'Course Purchase'
        });
        await student.save();
      }
    } else if (user.role === 'donor') {
      let donor = await Donor.findOne({ email: finalEmail });
      if (!donor) {
        donor = new Donor({
          donorId: `DNR-${Date.now().toString().slice(-4)}`,
          name: user.name,
          email: finalEmail,
          phone: user.phone,
          totalDonated: '₹0',
          campaignsSupported: 0,
          status: 'Active'
        });
        await donor.save();
      }
    }

    res.json({
      status: true,
      message: 'Registration completed successfully',
      data: {
        ...user.toObject(),
        verified: !!user.verified
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(400).json({ status: false, message: `This ${field} is already registered with another account.` });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({ status: false, message: messages });
    }
    res.status(400).json({ status: false, message: err.message || 'Registration failed' });
  }
};

router.post('/register', authMiddleware, registerHandler);
router.post('/profile-setup', authMiddleware, registerHandler);

/**
 * @route   POST /api/auth/logout
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({ status: true, message: 'Logged out successfully' });
});

module.exports = router;
