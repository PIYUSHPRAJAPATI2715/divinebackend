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
const Referral = require('../models/Referral');
const authMiddleware = require('../middleware/auth');
const { normalizePhone, getPhoneVariants, buildPhoneFilter, findUserByPhone } = require('../utils/phone');
const { getAllFollowersForEntity, formatFollowerItem } = require('../utils/followers');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

const generateReferralCode = (name = 'USER') => {
  const clean = (name || 'DIVINE').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'DIVN';
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${clean}${rand}`;
};

const processReferralLink = async (user, inputReferralCode) => {
  if (!inputReferralCode || typeof inputReferralCode !== 'string') return;
  const code = inputReferralCode.trim().toUpperCase();
  if (!code || user.referredBy) return;
  if (user.referralCode && user.referralCode.toUpperCase() === code) return;

  try {
    const referrer = await User.findOne({
      referralCode: { $regex: new RegExp(`^${code}$`, 'i') },
      _id: { $ne: user._id }
    });

    if (referrer) {
      user.referredBy = referrer.referralCode;
      const existingRef = await Referral.findOne({
        referrerName: referrer.name || referrer.phone,
        referredUserName: user.name || user.phone
      });
      if (!existingRef) {
        const refEntry = new Referral({
          referralId: `REF-${Date.now().toString().slice(-4)}`,
          referrerName: referrer.name || referrer.phone,
          referredUserName: user.name || user.phone || 'New User',
          rewardAmount: 100,
          status: 'Completed'
        });
        await refEntry.save();

        referrer.walletBalance = (referrer.walletBalance || 0) + 100;
        referrer.totalCoins = (referrer.totalCoins || 0) + 50;
        await referrer.save();

        user.walletBalance = (user.walletBalance || 0) + 50;

        try {
          const { createAndSendNotification } = require('../utils/notification');
          await createAndSendNotification({
            userId: referrer._id,
            title: 'Referral Reward Received! 🎁',
            body: `Congratulations! ${user.name || 'A friend'} joined using your referral code (${referrer.referralCode}). ₹100 has been credited to your wallet.`,
            type: 'referral'
          });
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('Error processing referral link:', err.message);
  }
};

const constructFullUserData = async (user) => {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : user;
  let extra = {};

  // Build conditions for NGO lookup
  let ngo = null;
  const ngoOrConditions = [];
  if (user.email) ngoOrConditions.push({ email: user.email });
  if (user.phone) ngoOrConditions.push(buildPhoneFilter(user.phone));
  const orgName = (user.organizationName || user.name || '').trim();
  if (orgName && orgName !== 'Google User' && orgName !== 'Apple User') {
    ngoOrConditions.push({ name: orgName });
  }

  // Only lookup NGO if user role is explicitly ngo or corporate
  if (user.role === 'ngo' || user.role === 'corporate') {
    if (ngoOrConditions.length > 0) {
      ngo = await NGO.findOne({ $or: ngoOrConditions });
    }

    if (ngo) {
      extra = ngo.toObject();
      const ngoRole = (ngo.organizationType === 'Corporate' || ngo.organizationType === 'Company') ? 'corporate' : 'ngo';
      if (user.role !== ngoRole || user.isProfileComplete !== true) {
        user.role = ngoRole;
        user.isProfileComplete = true;
        if (!user.name || user.name === 'Google User' || user.name === 'Apple User' || user.name === '') {
          user.name = ngo.name;
        }
        user.organizationName = ngo.name;
        if (!user.phone && ngo.phone) user.phone = ngo.phone;
        await user.save().catch(() => {});
      }
    }
  } else if (user.role === 'teacher') {
    const teacherOr = [];
    if (user.email) teacherOr.push({ email: user.email });
    if (user.phone) teacherOr.push(buildPhoneFilter(user.phone));
    let teacher = teacherOr.length > 0 ? await Teacher.findOne({ $or: teacherOr }) : null;
    if (teacher) extra = teacher.toObject();
  } else if (user.role === 'student') {
    const studentOr = [];
    if (user.email) studentOr.push({ email: user.email });
    if (user.phone) studentOr.push(buildPhoneFilter(user.phone));
    let student = studentOr.length > 0 ? await Student.findOne({ $or: studentOr }) : null;
    if (student) extra = student.toObject();
  } else if (user.role === 'donor') {
    const donorOr = [];
    if (user.email) donorOr.push({ email: user.email });
    if (user.phone) donorOr.push(buildPhoneFilter(user.phone));
    let donor = donorOr.length > 0 ? await Donor.findOne({ $or: donorOr }) : null;
    if (donor) extra = donor.toObject();
  }

  const determinedRole = (extra.organizationType === 'Corporate' || user.role === 'corporate') ? 'corporate' : (user.role || 'donor');
  const hasExtraProfile = !!(extra && extra._id);
  const isProfileComplete = !!(
    user.isProfileComplete === true ||
    extra.isProfileComplete === true ||
    (ngo && ngo._id) ||
    (hasExtraProfile && (user.role === 'corporate' || user.role === 'ngo' || user.role === 'teacher' || user.role === 'student')) ||
    (user.name && user.name !== 'Google User' && user.name !== 'Apple User' && (user.phone || extra.phone))
  );

  let isVer = false;
  if (!isProfileComplete) {
    isVer = false;
  } else if (determinedRole === 'corporate' || user.role === 'ngo' || user.role === 'corporate') {
    isVer = (user.verified === true) || (extra.verified === true) || (extra.status === 'Verified') || (user.status === 'Verified');
  } else {
    isVer = user.verified === false ? false : (extra.status === 'Suspended' ? false : true);
  }

  return {
    ...userObj,
    ...extra,
    role: determinedRole,
    status: extra.status || user.status || 'Active',
    verificationStatus: extra.status || user.status || (isVer ? 'Verified' : 'Pending'),
    rejectionReason: extra.rejectionReason || user.rejectionReason || '',
    rejectedAt: extra.rejectedAt || null,
    resubmittedAt: extra.resubmittedAt || null,
    canResubmit: (extra.status === 'Rejected' || user.status === 'Rejected'),
    referralCode: user.referralCode || '',
    referredBy: user.referredBy || '',
    isProfileComplete,
    verified: isVer,
    walletBalance: user.walletBalance || 0,
    cashbackBalance: user.cashbackBalance || 0,
    totalCoins: user.totalCoins || 0,
    coinsValueInRupees: Math.round(((user.totalCoins || 0) / 10) * 100) / 100,
    pushNotification: user.pushNotification !== false,
    emailNotification: user.emailNotification !== false,
    smsNotification: user.smsNotification !== false
  };
};

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
    const user = await findUserByPhone(phone, User);
    if (!user) {
      const ngo = await NGO.findOne(buildPhoneFilter(phone));
      if (ngo && ngo.status !== 'Deleted') {
        return res.json({
          status: true,
          isUserExist: true,
          isProfileComplete: true,
          role: (ngo.organizationType === 'Corporate' || ngo.organizationType === 'Company') ? 'corporate' : 'ngo',
          name: ngo.name
        });
      }
      return res.json({ status: false, isUserExist: false, message: 'User not found' });
    }
    if (user.isDeleted === true || user.status === 'Deleted') {
      return res.json({
        status: false,
        isUserExist: false,
        message: 'User not found',
        isDeleted: true
      });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({
        status: false,
        isUserExist: true,
        message: 'Your account has been suspended by an administrator.',
        isSuspended: true
      });
    }
    const fullData = await constructFullUserData(user);
    res.json({
      status: true,
      isProfileComplete: !!fullData?.isProfileComplete,
      role: fullData?.role || user.role,
      name: fullData?.name || user.name
    });
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
    let existingUser = await findUserByPhone(phone, User);
    if (existingUser && (existingUser.isDeleted === true || existingUser.status === 'Deleted')) {
      return res.status(403).json({
        status: false,
        message: 'Your account has been deleted by an administrator. You cannot sign up or log in with this phone number.',
        isDeleted: true
      });
    }
    if (existingUser && existingUser.status === 'Suspended') {
      return res.status(403).json({
        status: false,
        message: 'Your account has been suspended by an administrator.',
        isSuspended: true
      });
    }
    let ngo = null;
    if (!existingUser) {
      ngo = await NGO.findOne(buildPhoneFilter(phone));
    }

    const inputReferral = req.body.referralCode || req.body.referredBy;

    if (existingUser) {
      existingUser.otp = '1234';
      existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      if (!existingUser.referralCode) {
        existingUser.referralCode = generateReferralCode(existingUser.name || 'USER');
      }
      if (inputReferral && !existingUser.referredBy) {
        await processReferralLink(existingUser, inputReferral);
      }

      const matchedNgo = await NGO.findOne({
        $or: [
          buildPhoneFilter(phone),
          ...(existingUser.phone ? [buildPhoneFilter(existingUser.phone)] : []),
          ...(existingUser.email ? [{ email: existingUser.email }] : [])
        ]
      });
      if (matchedNgo) {
        existingUser.role = (matchedNgo.organizationType === 'Corporate' || matchedNgo.organizationType === 'Company') ? 'corporate' : 'ngo';
        existingUser.isProfileComplete = true;
        if (!existingUser.name || existingUser.name === 'Google User' || existingUser.name === 'Apple User') {
          existingUser.name = matchedNgo.name;
        }
        existingUser.organizationName = matchedNgo.name;
      }

      await existingUser.save();
      const fullData = await constructFullUserData(existingUser);
      return res.json({
        status: true,
        message: 'OTP sent successfully (Use static code 1234 to verify)',
        isProfileComplete: !!fullData?.isProfileComplete,
        phone: existingUser.phone || phone,
        role: existingUser.role,
        referralCode: existingUser.referralCode,
        otp: '1234'
      });
    }

    const initialRole = ngo ? ((ngo.organizationType === 'Corporate' || ngo.organizationType === 'Company') ? 'corporate' : 'ngo') : 'donor';
    const initialComplete = !!ngo;
    const initialName = ngo ? ngo.name : '';
    const myReferralCode = generateReferralCode(initialName || 'USER');

    const newUser = new User({
      phone,
      role: initialRole,
      name: initialName,
      isProfileComplete: initialComplete,
      referralCode: myReferralCode,
      otp: '1234',
      otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
    });
    await newUser.save();
    if (inputReferral) {
      await processReferralLink(newUser, inputReferral);
      await newUser.save();
    }
    res.json({
      status: true,
      message: 'OTP sent successfully (Use static code 1234 to verify)',
      isProfileComplete: initialComplete,
      phone,
      role: initialRole,
      referralCode: myReferralCode,
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
      let existingUser = await findUserByPhone(phone, User);
      let ngo = null;
      if (!existingUser) {
        ngo = await NGO.findOne(buildPhoneFilter(phone));
      }

      if (!existingUser && (!ngo || ngo.status === 'Deleted')) {
        return res.json({
          status: false,
          isUserExist: false,
          message: 'User not found'
        });
      }

      if (existingUser && (existingUser.isDeleted === true || existingUser.status === 'Deleted')) {
        return res.json({
          status: false,
          isUserExist: false,
          message: 'User not found',
          isDeleted: true
        });
      }
      if (existingUser && existingUser.status === 'Suspended') {
        return res.status(403).json({
          status: false,
          isUserExist: true,
          message: 'Your account has been suspended by an administrator.',
          isSuspended: true
        });
      }

      if (existingUser) {
        existingUser.otp = '1234';
        existingUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        const matchedNgo = await NGO.findOne({
          $or: [
            buildPhoneFilter(phone),
            ...(existingUser.phone ? [buildPhoneFilter(existingUser.phone)] : []),
            ...(existingUser.email ? [{ email: existingUser.email }] : [])
          ]
        });
        if (matchedNgo) {
          existingUser.role = (matchedNgo.organizationType === 'Corporate' || matchedNgo.organizationType === 'Company') ? 'corporate' : 'ngo';
          existingUser.isProfileComplete = true;
          if (!existingUser.name || existingUser.name === 'Google User' || existingUser.name === 'Apple User') {
            existingUser.name = matchedNgo.name;
          }
          existingUser.organizationName = matchedNgo.name;
        }

        await existingUser.save();
        const fullData = await constructFullUserData(existingUser);
        const userComplete = !!fullData?.isProfileComplete;
        const verStatus = fullData?.verificationStatus || (existingUser.status === 'Verified' ? 'Verified' : (existingUser.status === 'Rejected' ? 'Rejected' : 'Pending'));
        return res.json({
          status: true,
          message: 'OTP sent successfully (Use static code 1234 to verify)',
          isUserExist: userComplete,
          isProfileComplete: userComplete,
          verificationStatus: verStatus,
          verified: !!fullData?.verified,
          rejectionReason: fullData?.rejectionReason || existingUser.rejectionReason || '',
          canResubmit: !!fullData?.canResubmit,
          phone: existingUser.phone || phone,
          role: existingUser.role,
          otp: '1234',
          data: {
            isUserExist: userComplete,
            isProfileComplete: userComplete,
            verificationStatus: verStatus,
            verified: !!fullData?.verified,
            rejectionReason: fullData?.rejectionReason || existingUser.rejectionReason || '',
            canResubmit: !!fullData?.canResubmit,
            phone: existingUser.phone || phone,
            role: existingUser.role
          }
        });
      }

      // Existing NGO profile without user record -> create user for this NGO
      if (ngo && ngo.status !== 'Deleted') {
        const initialRole = (ngo.organizationType === 'Corporate' || ngo.organizationType === 'Company') ? 'corporate' : 'ngo';
        const initialComplete = true;
        const initialName = ngo.name || '';
        const newVerStatus = ngo.status || 'Pending';

        const newUser = new User({
          phone,
          role: initialRole,
          name: initialName,
          organizationName: initialName,
          isProfileComplete: initialComplete,
          status: newVerStatus,
          verificationStatus: newVerStatus,
          otp: '1234',
          otpExpiry: new Date(Date.now() + 10 * 60 * 1000)
        });
        await newUser.save();
        return res.json({
          status: true,
          message: 'OTP sent successfully (Use static code 1234 to verify)',
          isUserExist: true,
          isProfileComplete: true,
          verificationStatus: newVerStatus,
          verified: !!(ngo.status === 'Verified' || ngo.verified),
          rejectionReason: ngo.rejectionReason || '',
          canResubmit: ngo.status === 'Rejected',
          phone,
          role: initialRole,
          otp: '1234',
          data: {
            isUserExist: true,
            isProfileComplete: true,
            verificationStatus: newVerStatus,
            verified: !!(ngo.status === 'Verified' || ngo.verified),
            rejectionReason: ngo.rejectionReason || '',
            canResubmit: ngo.status === 'Rejected',
            phone,
            role: initialRole
          }
        });
      }
    }
    if (email && password) {
      const cleanEmail = email.toLowerCase().trim();
      let admin = await Admin.findOne({ email: cleanEmail });
      if (!admin) {
        admin = await Admin.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
      }

      // Auto-provision standard profiles if they don't exist yet in the database
      if (!admin) {
        if (cleanEmail === 'social.admin@divine.org' || cleanEmail === 'ngo.admin@divine.org') {
          admin = await Admin.create({
            email: cleanEmail,
            password: 'password123',
            name: 'Social Welfare Admin',
            role: 'social_admin',
            platform: 'social'
          });
        } else if (cleanEmail === 'astro.admin@divine.org' || cleanEmail === 'coaching.admin@divine.org') {
          admin = await Admin.create({
            email: cleanEmail,
            password: 'password123',
            name: 'Astro Learning Admin',
            role: 'astro_admin',
            platform: 'astro'
          });
        }
      }

      if (admin) {
        const isPlainMatch = admin.password === password;
        let isHashMatch = false;
        if (!isPlainMatch && admin.password.startsWith('$2')) {
          isHashMatch = await bcrypt.compare(password, admin.password);
        }
        if (isPlainMatch || isHashMatch) {
          const adminRole = admin.role || (admin.platform === 'social' ? 'social_admin' : (admin.platform === 'astro' ? 'astro_admin' : 'superadmin'));
          const adminPlatform = admin.platform || (adminRole === 'social_admin' ? 'social' : (adminRole === 'astro_admin' ? 'astro' : 'all'));
          const adminName = admin.name || (adminRole === 'social_admin' ? 'Social Welfare Admin' : (adminRole === 'astro_admin' ? 'Astro Learning Admin' : 'Divine Master Admin'));

          const token = jwt.sign({ 
            id: admin._id, 
            role: adminRole,
            platform: adminPlatform,
            email: admin.email,
            name: adminName
          }, JWT_SECRET, { expiresIn: '7d' });

          return res.json({
            status: true,
            message: 'Login successful',
            token,
            data: { 
              id: admin._id, 
              email: admin.email, 
              name: adminName,
              role: adminRole,
              platform: adminPlatform
            }
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
    const user = await findUserByPhone(phone, User);
    if (!user) return res.status(404).json({ status: false, message: 'User session not found. Please initiate signup/login first.' });
    if (user.isDeleted === true || user.status === 'Deleted') {
      return res.status(403).json({ status: false, message: 'Your account has been deleted by an administrator.', isDeleted: true });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ status: false, message: 'Your account has been suspended by an administrator.', isSuspended: true });
    }
    user.otp = '1234';
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    res.json({ status: true, message: 'OTP resent successfully (Use static code 1234 to verify)', phone: user.phone || phone, role: user.role, otp: '1234' });
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
    const user = await findUserByPhone(phone, User);
    if (!user || user.isDeleted === true || user.status === 'Deleted') {
      return res.json({ status: false, message: 'User not found' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ status: false, message: 'Your account has been suspended by an administrator.', isSuspended: true });
    }
    if (!user.otp || user.otp !== otp) return res.status(400).json({ status: false, message: 'Invalid OTP' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ status: false, message: 'OTP has expired. Please request a new OTP.' });
    user.otp = null;
    user.otpExpiry = null;

    // Cross-check NGO collection for auto-healing role & completeness
    const ngo = await NGO.findOne({
      $or: [
        ...(user.email ? [{ email: user.email }] : []),
        buildPhoneFilter(phone),
        ...(user.phone ? [buildPhoneFilter(user.phone)] : [])
      ]
    });

    if (ngo) {
      user.role = (ngo.organizationType === 'Corporate' || ngo.organizationType === 'Company') ? 'corporate' : 'ngo';
      user.isProfileComplete = true;
      if (!user.name || user.name === 'Google User' || user.name === 'Apple User' || user.name === '') {
        user.name = ngo.name;
      }
      user.organizationName = ngo.name;
    }

    const inputReferral = req.body.referralCode || req.body.referredBy;
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name || 'USER');
    }
    if (inputReferral && !user.referredBy) {
      await processReferralLink(user, inputReferral);
    }

    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, phone: user.phone || phone, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const fullData = await constructFullUserData(user);
    const isComplete = !!(fullData?.isProfileComplete || user.isProfileComplete || ngo);
    const verifiedStatus = !!(fullData?.verified || user.verified || (ngo && (ngo.status === 'Verified' || ngo.verified)));

    const currentVerStatus = fullData?.verificationStatus || (verifiedStatus ? 'Verified' : (user.status === 'Rejected' ? 'Rejected' : 'Pending'));
    const currentRejectionReason = fullData?.rejectionReason || user.rejectionReason || (ngo ? ngo.rejectionReason : '') || '';
    const canResubmitFlag = fullData?.canResubmit || (currentVerStatus === 'Rejected');

    res.json({
      status: true,
      success: true,
      message: 'OTP verified successfully',
      token,
      isProfileComplete: isComplete,
      verified: verifiedStatus,
      verificationStatus: currentVerStatus,
      rejectionReason: currentRejectionReason,
      canResubmit: canResubmitFlag,
      data: {
        token,
        isProfileComplete: isComplete,
        verified: verifiedStatus,
        verificationStatus: currentVerStatus,
        rejectionReason: currentRejectionReason,
        canResubmit: canResubmitFlag,
        ...fullData,
        role: user.role,
        isProfileComplete: isComplete
      }
    });
  } catch (err) {
    res.status(400).json({ status: false, success: false, message: err.message || 'OTP verification failed' });
  }
});

/**
 * @route   POST /api/auth/google
 * @desc    Google Sign-in / Signup endpoint
 * @access  Public
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken, email, displayName, photoUrl, fcmToken, deviceToken, platform } = req.body;
    const tokenVal = fcmToken || deviceToken || req.body.token || req.body.device_token || req.body.fcm_token;

    if (!email && !idToken) {
      return res.status(400).json({ status: false, success: false, message: 'Google ID token or email is required' });
    }

    let googleSub = idToken;
    if (idToken && typeof idToken === 'string' && idToken.includes('.')) {
      try {
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payloadJson.sub || payloadJson.user_id) {
            googleSub = payloadJson.sub || payloadJson.user_id;
          }
        }
      } catch (e) {}
    }

    const cleanEmail = email ? String(email).toLowerCase().trim() : null;
    let existingUser = null;

    if (cleanEmail) {
      existingUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { googleEmail: cleanEmail }
        ]
      });
    }
    if (!existingUser && googleSub) {
      existingUser = await User.findOne({ googleId: googleSub });
    }
    if (!existingUser && idToken && idToken !== googleSub) {
      existingUser = await User.findOne({ googleId: idToken });
    }

    let user = existingUser;
    if (user && (user.isDeleted === true || user.status === 'Deleted')) {
      return res.status(403).json({
        status: false,
        success: false,
        message: 'Your account has been deleted by an administrator. You cannot log in with this Google account.',
        isDeleted: true
      });
    }
    if (user && user.status === 'Suspended') {
      return res.status(403).json({
        status: false,
        success: false,
        message: 'Your account has been suspended by an administrator.',
        isSuspended: true
      });
    }

    if (!user) {
      user = new User({
        email: cleanEmail || undefined,
        googleEmail: cleanEmail || undefined,
        googleId: googleSub || idToken || null,
        name: displayName || 'Google User',
        profilePhoto: photoUrl || null,
        role: 'donor',
        fcmToken: tokenVal || null,
        deviceToken: tokenVal || null,
        platform: platform || 'android',
        isProfileComplete: false,
        verified: false
      });
      await user.save();

      const { createAndSendNotification } = require('../utils/notification');
      await createAndSendNotification({
        userId: user._id,
        title: 'Welcome to Divine Platform! 🙏',
        body: `Welcome ${user.name}! Your Google account has been registered successfully.`,
        type: 'registration',
        screen: 'home'
      });
    } else {
      let updated = false;
      if (googleSub && user.googleId !== googleSub) { user.googleId = googleSub; updated = true; }
      if (cleanEmail && !user.googleEmail) { user.googleEmail = cleanEmail; updated = true; }
      if (displayName && (!user.name || user.name === 'Google User' || user.name === 'User')) { user.name = displayName; updated = true; }
      if (photoUrl && !user.profilePhoto) { user.profilePhoto = photoUrl; updated = true; }
      if (tokenVal && (user.fcmToken !== tokenVal || user.deviceToken !== tokenVal)) {
        user.fcmToken = tokenVal;
        user.deviceToken = tokenVal;
        updated = true;
      }
      if (platform && user.platform !== platform) { user.platform = platform; updated = true; }
      if (updated) await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    const fullData = await constructFullUserData(user);
    const realVerified = !!fullData?.verified;
    const isComplete = !!fullData?.isProfileComplete;

    const googleVerStatus = fullData?.verificationStatus || (realVerified ? 'Verified' : (user.status === 'Rejected' ? 'Rejected' : 'Pending'));
    const googleRejectionReason = fullData?.rejectionReason || user.rejectionReason || '';
    const googleCanResubmit = fullData?.canResubmit || (googleVerStatus === 'Rejected');

    return res.json({
      status: true,
      success: true,
      isProfileComplete: isComplete,
      verified: realVerified,
      verificationStatus: googleVerStatus,
      rejectionReason: googleRejectionReason,
      canResubmit: googleCanResubmit,
      message: 'Login successful',
      token,
      role: user.role,
      data: {
        token,
        isProfileComplete: isComplete,
        verified: realVerified,
        verificationStatus: googleVerStatus,
        rejectionReason: googleRejectionReason,
        canResubmit: googleCanResubmit,
        role: user.role,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isProfileComplete: isComplete,
          verified: realVerified,
          verificationStatus: googleVerStatus,
          rejectionReason: googleRejectionReason,
          canResubmit: googleCanResubmit,
          ...fullData
        }
      }
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      console.log('E11000 duplicate key error detected during Google auth, auto-cleaning legacy null phone index...');
      try {
        await User.updateMany({ $or: [{ phone: null }, { phone: "" }] }, { $unset: { phone: "" } });
        try { await User.collection.dropIndex('phone_1'); } catch (e) {}
        let retryUser = null;
        if (req.body.email) retryUser = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
        if (!retryUser && req.body.idToken) retryUser = await User.findOne({ googleId: req.body.idToken });
        if (!retryUser) {
          retryUser = new User({
            email: req.body.email ? String(req.body.email).toLowerCase().trim() : undefined,
            googleId: req.body.idToken || null,
            name: req.body.displayName || 'Google User',
            profilePhoto: req.body.photoUrl || null,
            role: 'donor',
            fcmToken: req.body.fcmToken || null,
            isProfileComplete: false,
            verified: false
          });
          await retryUser.save();
        }
        const token = jwt.sign({ id: retryUser._id, role: retryUser.role, email: retryUser.email }, JWT_SECRET, { expiresIn: '7d' });
        const fullData = await constructFullUserData(retryUser);
        const retryRealVerified = !!fullData?.verified;
        const retryIsComplete = !!fullData?.isProfileComplete;
        return res.json({
          status: true,
          success: true,
          isProfileComplete: retryIsComplete,
          verified: retryRealVerified,
          message: 'Login successful',
          token,
          role: retryUser.role,
          data: {
            token,
            isProfileComplete: retryIsComplete,
            verified: retryRealVerified,
            role: retryUser.role,
            user: {
              _id: retryUser._id,
              id: retryUser._id,
              name: retryUser.name,
              email: retryUser.email,
              role: retryUser.role,
              isProfileComplete: retryIsComplete,
              verified: retryRealVerified,
              ...fullData
            }
          }
        });
      } catch (retryErr) {
        console.error('Google Auth Retry Error:', retryErr);
      }
    }
    console.error('Google Auth Error:', err);
    res.status(400).json({ status: false, success: false, message: err.message || 'Google authentication failed' });
  }
});

/**
 * @route   POST /api/auth/apple
 * @desc    Apple Sign-in / Signup endpoint
 * @access  Public
 */
router.post('/apple', async (req, res) => {
  try {
    const { identityToken, authorizationCode, email, firstName, lastName, fcmToken } = req.body;
    if (!identityToken && !authorizationCode && !email) {
      return res.status(400).json({ status: false, success: false, message: 'Apple identity token or authorization code is required' });
    }

    const cleanFirstName = (firstName && typeof firstName === 'string') ? firstName.trim() : '';
    const cleanLastName = (lastName && typeof lastName === 'string') ? lastName.trim() : '';
    const appleName = `${cleanFirstName} ${cleanLastName}`.trim() || null;

    let existingUser = null;
    if (email && typeof email === 'string' && email.trim() !== '') {
      existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    }
    if (!existingUser && identityToken) {
      existingUser = await User.findOne({ appleId: identityToken });
    }

    const isUserExist = !!existingUser;
    let user = existingUser;
    if (user && (user.isDeleted === true || user.status === 'Deleted')) {
      return res.status(403).json({
        status: false,
        success: false,
        message: 'Your account has been deleted by an administrator. You cannot log in with this Apple account.',
        isDeleted: true
      });
    }
    if (user && user.status === 'Suspended') {
      return res.status(403).json({
        status: false,
        success: false,
        message: 'Your account has been suspended by an administrator.',
        isSuspended: true
      });
    }

    if (!user) {
      user = new User({
        email: (email && typeof email === 'string' && email.trim() !== '') ? email.trim().toLowerCase() : undefined,
        appleId: identityToken || authorizationCode || null,
        name: appleName || 'Apple User',
        role: 'donor',
        fcmToken: fcmToken || null,
        isProfileComplete: false,
        verified: false
      });
      await user.save();

      const { createAndSendNotification } = require('../utils/notification');
      await createAndSendNotification({
        userId: user._id,
        title: 'Welcome to Divine Platform! 🙏',
        body: `Welcome ${user.name}! Your Apple account has been registered successfully.`,
        type: 'registration',
        screen: 'home'
      });
    } else {
      let updated = false;
      if (!user.appleId && (identityToken || authorizationCode)) {
        user.appleId = identityToken || authorizationCode;
        updated = true;
      }
      if (appleName && (!user.name || user.name === 'User')) {
        user.name = appleName;
        updated = true;
      }
      if (fcmToken) {
        user.fcmToken = fcmToken;
        updated = true;
      }
      if (updated) await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
    const fullData = await constructFullUserData(user);
    const realVerified = !!fullData?.verified;
    const isComplete = !!fullData?.isProfileComplete;

    const appleVerStatus = fullData?.verificationStatus || (realVerified ? 'Verified' : (user.status === 'Rejected' ? 'Rejected' : 'Pending'));
    const appleRejectionReason = fullData?.rejectionReason || user.rejectionReason || '';
    const appleCanResubmit = fullData?.canResubmit || (appleVerStatus === 'Rejected');

    return res.json({
      status: true,
      success: true,
      isProfileComplete: isComplete,
      verified: realVerified,
      verificationStatus: appleVerStatus,
      rejectionReason: appleRejectionReason,
      canResubmit: appleCanResubmit,
      message: 'Login successful',
      token,
      role: user.role,
      data: {
        token,
        isProfileComplete: isComplete,
        verified: realVerified,
        verificationStatus: appleVerStatus,
        rejectionReason: appleRejectionReason,
        canResubmit: appleCanResubmit,
        role: user.role,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isProfileComplete: isComplete,
          verified: realVerified,
          verificationStatus: appleVerStatus,
          rejectionReason: appleRejectionReason,
          canResubmit: appleCanResubmit,
          ...fullData
        }
      }
    });
  } catch (err) {
    if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
      console.log('E11000 duplicate key error detected during Apple auth, auto-cleaning legacy null phone index...');
      try {
        await User.updateMany({ $or: [{ phone: null }, { phone: "" }] }, { $unset: { phone: "" } });
        try { await User.collection.dropIndex('phone_1'); } catch (e) {}
        let retryUser = null;
        if (req.body.email) retryUser = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });
        if (!retryUser && req.body.identityToken) retryUser = await User.findOne({ appleId: req.body.identityToken });
        if (!retryUser) {
          retryUser = new User({
            email: req.body.email ? String(req.body.email).toLowerCase().trim() : undefined,
            appleId: req.body.identityToken || req.body.authorizationCode || null,
            name: 'Apple User',
            role: 'donor',
            fcmToken: req.body.fcmToken || null,
            isProfileComplete: false,
            verified: false
          });
          await retryUser.save();
        }
        const token = jwt.sign({ id: retryUser._id, role: retryUser.role, email: retryUser.email }, JWT_SECRET, { expiresIn: '7d' });
        const fullData = await constructFullUserData(retryUser);
        const retryRealVerified = !!fullData?.verified;
        const retryIsComplete = !!fullData?.isProfileComplete;
        return res.json({
          status: true,
          success: true,
          isProfileComplete: retryIsComplete,
          verified: retryRealVerified,
          message: 'Login successful',
          token,
          role: retryUser.role,
          data: {
            token,
            isProfileComplete: retryIsComplete,
            verified: retryRealVerified,
            role: retryUser.role,
            user: {
              _id: retryUser._id,
              id: retryUser._id,
              name: retryUser.name,
              email: retryUser.email,
              role: retryUser.role,
              isProfileComplete: retryIsComplete,
              verified: retryRealVerified,
              ...fullData
            }
          }
        });
      } catch (retryErr) {
        console.error('Apple Auth Retry Error:', retryErr);
      }
    }
    console.error('Apple Auth Error:', err);
    res.status(400).json({ status: false, success: false, message: err.message || 'Apple authentication failed' });
  }
});

/**
 * @route   POST /api/device-token & POST /api/auth/fcm-token
 * @desc    Register or Update Device Push Notification Token (FCM / APNs)
 * @access  Public / Private
 */
const handleFcmTokenUpdate = async (req, res) => {
  try {
    const tokenVal = req.body.deviceToken || req.body.fcmToken || req.body.token || req.body.device_token || req.body.fcm_token;
    const platform = req.body.platform || 'android';

    if (!tokenVal) {
      return res.status(400).json({ status: false, success: false, message: 'deviceToken or fcmToken is required in request body' });
    }

    let targetUserId = req.user?.id || req.user?._id || req.body.userId || req.body.user_id;

    // If req.user wasn't attached by authMiddleware, attempt token decoding manually
    if (!targetUserId) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          targetUserId = decoded?.id || decoded?._id;
        } catch (e) {}
      }
    }

    let user = null;
    if (targetUserId) user = await User.findById(targetUserId);
    if (!user && req.body.phone) user = await User.findOne({ phone: req.body.phone });
    if (!user && req.body.email) user = await User.findOne({ email: String(req.body.email).toLowerCase().trim() });

    if (user) {
      user.fcmToken = tokenVal;
      user.deviceToken = tokenVal;
      user.platform = platform;
      await user.save();
      return res.json({
        status: true,
        success: true,
        message: 'Device token linked and saved successfully to user profile',
        userId: user._id,
        deviceToken: tokenVal,
        fcmToken: tokenVal,
        platform
      });
    }

    return res.status(401).json({
      status: false,
      success: false,
      message: 'Authentication required. Please include Authorization: Bearer <token> header to link deviceToken to logged-in user profile.'
    });
  } catch (err) {
    res.status(400).json({ status: false, success: false, message: err.message });
  }
};

const handleDeviceTokenRemove = async (req, res) => {
  try {
    const tokenVal = req.body.deviceToken || req.body.fcmToken || req.body.token || req.body.device_token || req.body.fcm_token;

    let targetUserId = req.user?.id || req.user?._id || req.body.userId || req.body.user_id;

    if (!targetUserId) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          targetUserId = decoded?.id || decoded?._id;
        } catch (e) {}
      }
    }

    let user = null;
    if (targetUserId) user = await User.findById(targetUserId);
    if (!user && tokenVal) user = await User.findOne({ $or: [{ fcmToken: tokenVal }, { deviceToken: tokenVal }] });

    if (user) {
      user.fcmToken = null;
      user.deviceToken = null;
      await user.save();
      return res.json({
        status: true,
        success: true,
        message: 'Device token removed successfully'
      });
    }

    if (tokenVal) {
      await User.updateMany(
        { $or: [{ fcmToken: tokenVal }, { deviceToken: tokenVal }] },
        { $set: { fcmToken: null, deviceToken: null } }
      );
    }

    res.json({
      status: true,
      success: true,
      message: 'Device token removed successfully'
    });
  } catch (err) {
    res.status(400).json({ status: false, success: false, message: err.message });
  }
};

const handleTestNotification = async (req, res) => {
  try {
    const { title, body, message, type, screen, id, dataId, deviceToken } = req.body;

    let targetUserId = req.user?.id || req.user?._id || req.body.userId || req.body.user_id;

    if (!targetUserId) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          targetUserId = decoded?.id || decoded?._id;
        } catch (e) {}
      }
    }

    let user = null;
    if (targetUserId) user = await User.findById(targetUserId);
    if (!user && deviceToken) user = await User.findOne({ $or: [{ fcmToken: deviceToken }, { deviceToken }] });

    const finalTitle = title || 'Test Push Notification 🔔';
    const finalBody = body || message || 'This is a test notification from Divine Platform backend!';
    const finalType = type || 'campaign';
    const finalScreen = screen || 'campaign_details';
    const finalId = String(id || dataId || '123');
    const targetToken = deviceToken || user?.fcmToken || user?.deviceToken || 'SAMPLE_FCM_TOKEN_123';

    const { createAndSendNotification } = require('../utils/notification');
    const dispatchResult = await createAndSendNotification({
      userId: user?._id || null,
      title: finalTitle,
      body: finalBody,
      type: finalType,
      screen: finalScreen,
      dataId: finalId,
      fcmToken: targetToken
    });

    const pushPayload = {
      notification: {
        title: finalTitle,
        body: finalBody
      },
      data: {
        type: finalType,
        id: finalId,
        screen: finalScreen
      }
    };

    res.json({
      status: true,
      success: true,
      message: 'Test push notification dispatched successfully',
      targetUser: user ? { _id: user._id, name: user.name, email: user.email } : null,
      notification: dispatchResult?.notification || null,
      fcmResult: dispatchResult?.fcmResult || null
    });
  } catch (err) {
    res.status(400).json({ status: false, success: false, message: err.message });
  }
};

const handleDeviceTokenInfo = (req, res) => {
  res.json({
    status: true,
    message: 'Device Token Registration API',
    purpose: 'Used by mobile applications (Flutter/iOS/Android) to register or remove device push notification tokens (FCM/APNs) for sending push notifications to logged-in users.',
    endpoints: {
      register: 'POST /api/device-token',
      remove: 'POST /api/device-token/remove',
      testPush: 'POST /api/test-notification'
    },
    samplePayload: {
      deviceToken: 'FCM_OR_APNS_DEVICE_PUSH_TOKEN_HERE'
    }
  });
};

router.post('/test-notification', handleTestNotification);
router.post('/device-token/test-notification', handleTestNotification);
router.post('/device-token/remove', handleDeviceTokenRemove);
router.post('/fcm-token/remove', handleDeviceTokenRemove);
router.post('/remove', handleDeviceTokenRemove);
router.delete('/device-token', handleDeviceTokenRemove);
router.delete('/fcm-token', handleDeviceTokenRemove);
router.delete('/', handleDeviceTokenRemove);

router.post('/device-token', handleFcmTokenUpdate);
router.post('/fcm-token', handleFcmTokenUpdate);
router.post('/', handleFcmTokenUpdate);
router.get('/device-token', handleDeviceTokenInfo);
router.get('/fcm-token', handleDeviceTokenInfo);
router.get('/', handleDeviceTokenInfo);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged-in user full profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }
    const userId = req.user.id || req.user._id;
    const isSpecialAdmin = ['admin', 'superadmin', 'social_admin', 'astro_admin'].includes(req.user.role) || req.user.platform;
    if (isSpecialAdmin) {
      const Admin = require('../models/Admin');
      const adminDoc = await Admin.findById(userId);
      if (adminDoc) {
        return res.json({
          status: true,
          data: {
            id: adminDoc._id,
            _id: adminDoc._id,
            email: adminDoc.email,
            name: adminDoc.name || req.user.name || 'Admin',
            role: adminDoc.role || req.user.role || 'superadmin',
            platform: adminDoc.platform || req.user.platform || 'all'
          }
        });
      }
    }

    const user = await User.findById(userId);
    if (!user || user.isDeleted === true || user.status === 'Deleted') {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const userObj = user.toObject();
    let enrichedExtra = {
      reviewCount: 0,
      reviews: [],
      impact: userObj.impactStats || '',
      impactStats: userObj.impactStats || '',
      followersCount: (userObj.followers || []).length,
      years: userObj.years || '',
      rating: 0.0
    };

    if (user.role === 'ngo' || user.role === 'corporate') {
      const Review = require('../models/Review');
      const NGO = require('../models/NGO');
      
      const ngoName = user.organizationName || user.name || '';
      let ngo = null;
      const ngoOrConditions = [];
      if (user.email) ngoOrConditions.push({ email: user.email });
      if (user.phone) ngoOrConditions.push(buildPhoneFilter(user.phone));
      if (ngoName && ngoName.trim() !== '' && ngoName !== 'Google User' && ngoName !== 'Apple User') {
        ngoOrConditions.push({ name: ngoName.trim() });
      }
      if (ngoOrConditions.length > 0) {
        ngo = await NGO.findOne({ $or: ngoOrConditions });
      }

      if (ngo) {
        const reviews = await Review.find({
          targetName: ngo.name,
          status: 'Approved'
        }).sort({ createdAt: -1 });

        let computedRating = 0.0;
        if (reviews.length > 0) {
          const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
          computedRating = Math.round(avg * 10) / 10;
        }

        const rawFollowers = await getAllFollowersForEntity(user);
        const followersList = rawFollowers.map(f => formatFollowerItem(f));
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
          impact: ngo.impactStats || '',
          impactStats: ngo.impactStats || '',
          years: ngo.years || '',
          rating: computedRating,
          verified: true
        };
      }
    }

    const meFullData = await constructFullUserData(user);
    const meVerStatus = meFullData?.verificationStatus || (user.status === 'Verified' ? 'Verified' : (user.status === 'Rejected' ? 'Rejected' : 'Pending'));
    const meRejectionReason = meFullData?.rejectionReason || user.rejectionReason || enrichedExtra.rejectionReason || '';
    const meCanResubmit = meFullData?.canResubmit || (meVerStatus === 'Rejected');

    res.json({
      status: true,
      verified: !!meFullData?.verified,
      verificationStatus: meVerStatus,
      rejectionReason: meRejectionReason,
      canResubmit: meCanResubmit,
      data: {
        ...meFullData,
        ...userObj,
        ...enrichedExtra,
        verified: !!meFullData?.verified,
        verificationStatus: meVerStatus,
        rejectionReason: meRejectionReason,
        canResubmit: meCanResubmit
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

    if (user.role === 'ngo' || user.role === 'corporate') {
      const ngoOrList = [];
      if (user.email) ngoOrList.push({ email: user.email });
      if (email) ngoOrList.push({ email });
      if (user.phone) ngoOrList.push(buildPhoneFilter(user.phone));
      let ngo = ngoOrList.length > 0 ? await NGO.findOne({ $or: ngoOrList }) : null;
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

      // Copy all 25 Non-Profit & 21 Corporate fields dynamically
      const extraFields = [
        'legalName', 'briefProfile', 'organizationType', 'isRegisteredNonProfit', 'isRegisteredCompany',
        'addressCertificate', 'moaAoaDocs', 'has12A', 'has80G', 'hasDarpan', 'hasCSR1', 'csr1Number', 'csr1Certificate',
        'hasFCRA', 'fcraNumber', 'fcraCertificate', 'websiteUrl', 'cancelledChequeDoc',
        'directorsKeyManagement', 'formFillerDetails', 'lastFinancialYearBudget', 'donorDatabaseStrength',
        'employeeStrength', 'hasCrowdfundedBefore', 'crowdfundingPlatformsUsed', 'campaignPlanningTimeframe',
        'purposeOfFundraising', 'csrObligation', 'csrAmountSpentPreviousYear', 'csrFocusAreas',
        'fundingPreferences', 'csrOfficerDetails', 'awardsRecognitions', 'declarations'
      ];
      extraFields.forEach(f => {
        if (req.body[f] !== undefined) ngo[f] = req.body[f];
      });

      await ngo.save();

      if (organizationName !== undefined) {
        user.name = organizationName;
        user.organizationName = organizationName;
      }
      if (req.body.name !== undefined) user.name = req.body.name;
      if (gender !== undefined) user.gender = gender;
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
      if (logo !== undefined) {
        user.logo = logo;
        user.profilePhoto = logo;
      }
      if (registeredAddress !== undefined) user.registeredAddress = registeredAddress;
      if (authorizedPerson !== undefined) user.authorizedPerson = authorizedPerson;
      if (designation !== undefined) user.designation = designation;
      if (about !== undefined) user.about = about;
      if (impactStats !== undefined) user.impactStats = impactStats;
      if (req.body.years !== undefined) user.years = req.body.years;

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

    if (req.body.pushNotification !== undefined) user.pushNotification = Boolean(req.body.pushNotification);
    if (req.body.emailNotification !== undefined) user.emailNotification = Boolean(req.body.emailNotification);
    if (req.body.smsNotification !== undefined) user.smsNotification = Boolean(req.body.smsNotification);

    await user.save();

    const fullData = await constructFullUserData(user);
    res.json({
      status: true,
      message: 'Profile updated successfully',
      data: fullData
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
    const { amount, tierId } = req.body;
    const rechargeAmount = Number(amount);
    if (!rechargeAmount || isNaN(rechargeAmount) || rechargeAmount <= 0) {
      return res.status(400).json({ status: false, message: 'Invalid top-up amount' });
    }
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const { processWalletRecharge } = require('./donor/wallet');
    const result = await processWalletRecharge(user, rechargeAmount, tierId);

    const fullData = await constructFullUserData(result.user);

    res.json({
      status: true,
      message: `Wallet topped up successfully! Added ₹${rechargeAmount}. Earned ₹${result.cashbackEarned} Cashback & ${result.coinsEarned} Coins.`,
      data: fullData,
      ...fullData
    });
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
        transactionId,
        userId: user._id,
        type: 'Donation',
        user: user.name || user.phone,
        mobile: user.phone || '',
        amount: Number(amount),
        status: 'Success',
        date: new Date(),
        item: `Direct Donation to ${ngo.name}`
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
          itemId: user._id,
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

      try {
        const { createAndSendNotification } = require('../utils/notification');
        await createAndSendNotification({
          userId: user._id,
          title: 'Donation Successful! 🎁',
          body: `Thank you ${user.name || 'Donor'}! Your direct donation of ₹${amount} to "${ngo.name}" was successful.`,
          type: 'donation',
          screen: 'my_donations',
          dataId: String(danDonation._id)
        });
      } catch (notifErr) {
        console.error('Direct donation notification error:', notifErr.message);
      }

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
        transactionId,
        userId: user._id,
        type: 'Donation',
        user: user.name || user.phone,
        mobile: user.phone || '',
        amount: Number(amount),
        status: 'Success',
        date: new Date(),
        item: campaign.title
      });
      await newTx.save();

      try {
        const { createAndSendNotification } = require('../utils/notification');
        await createAndSendNotification({
          userId: user._id,
          title: 'Donation Successful! 🎁',
          body: `Thank you ${user.name || 'Donor'}! Your donation of ₹${amount} to "${campaign.title}" was successful.`,
          type: 'donation',
          screen: 'my_donations',
          dataId: String(campaign._id)
        });
      } catch (notifErr) {
        console.error('Campaign donation notification error:', notifErr.message);
      }

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
      let cleanRole = (role || '').toLowerCase().trim();
      if (cleanRole === 'corporate') {
        user.role = 'corporate';
        req.body.organizationType = req.body.organizationType || 'Corporate';
      } else if (['donor', 'ngo', 'corporate', 'teacher', 'student'].includes(cleanRole)) {
        user.role = cleanRole;
      } else {
        return res.status(400).json({ status: false, message: 'Invalid role. Must be either "donor", "ngo", "corporate", "teacher", or "student".' });
      }
    }
    if (email) {
      const emailInUse = await User.findOne({ email, _id: { $ne: userId } });
      if (emailInUse) return res.status(400).json({ status: false, message: 'Email address is already in use by another account' });
      user.email = email;
    }
    if (phone) {
      const phoneInUse = await User.findOne({ ...buildPhoneFilter(phone), _id: { $ne: userId } });
      if (phoneInUse) return res.status(400).json({ status: false, message: 'Phone number is already in use by another account' });
      user.phone = phone;
    }

    if (user.role === 'ngo' || user.role === 'corporate') {
      const { organizationName, registeredAddress, authorizedPerson, designation, gender, profilePhoto } = req.body;
      if (!organizationName || !registeredAddress || !authorizedPerson || !designation) {
        return res.status(400).json({ status: false, message: 'Organization Name, Registered Address, Authorized Person name, and Designation are required for registration.' });
      }
      user.name = organizationName;
      user.organizationName = organizationName;
      user.registeredAddress = registeredAddress || '';
      user.authorizedPerson = authorizedPerson || '';
      user.designation = designation || '';
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
      user.verified = false;
      user.status = 'Pending';
      user.verificationStatus = 'Pending';
    } else if (user.role === 'teacher') {
      const { name, expertise, experience, gender, profilePhoto } = req.body;
      if (!name || !expertise || !experience) {
        return res.status(400).json({ status: false, message: 'Name, Expertise, and Experience are required for Teacher registration.' });
      }
      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
      user.verified = true;
      user.status = 'Active';
    } else {
      const { name, gender, profilePhoto } = req.body;
      if (!name) return res.status(400).json({ status: false, message: 'Name is required.' });
      user.name = name;
      user.gender = gender || null;
      user.profilePhoto = profilePhoto || null;
      user.verified = true;
      user.status = 'Active';
    }

    const inputReferral = req.body.referralCode || req.body.referredBy;
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name || req.body.organizationName || 'USER');
    }
    if (inputReferral && !user.referredBy) {
      await processReferralLink(user, inputReferral);
    }

    user.isProfileComplete = true;
    await user.save();

    // ----------------------------------------------------
    // REAL-TIME MULTI-COLLECTION SYNC
    // ----------------------------------------------------
    const finalEmail = user.email || req.body.email || `${(user.phone || '').replace(/[^0-9]/g, '')}@divine.com`;

    if (user.role === 'ngo' || user.role === 'corporate') {
      const ngoOrConditions = [{ email: finalEmail }];
      if (user.phone) ngoOrConditions.push(buildPhoneFilter(user.phone));
      if (req.body.organizationName && req.body.organizationName.trim()) {
        ngoOrConditions.push({ name: req.body.organizationName.trim() });
      }
      let ngo = await NGO.findOne({ $or: ngoOrConditions });

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

        // Copy all 25 Non-Profit & 21 Corporate registration fields
        const extraFields = [
          'legalName', 'briefProfile', 'organizationType', 'isRegisteredNonProfit', 'isRegisteredCompany',
          'addressCertificate', 'moaAoaDocs', 'has12A', 'has80G', 'hasDarpan', 'hasCSR1', 'csr1Number', 'csr1Certificate',
          'hasFCRA', 'fcraNumber', 'fcraCertificate', 'websiteUrl', 'cancelledChequeDoc',
          'directorsKeyManagement', 'formFillerDetails', 'lastFinancialYearBudget', 'donorDatabaseStrength',
          'employeeStrength', 'hasCrowdfundedBefore', 'crowdfundingPlatformsUsed', 'campaignPlanningTimeframe',
          'purposeOfFundraising', 'csrObligation', 'csrAmountSpentPreviousYear', 'csrFocusAreas',
          'fundingPreferences', 'csrOfficerDetails', 'awardsRecognitions', 'declarations'
        ];
        extraFields.forEach(f => {
          if (req.body[f] !== undefined) ngo[f] = req.body[f];
        });

        await ngo.save();
      } else {
        if (req.body.organizationName) ngo.name = req.body.organizationName;
        if (user.phone) ngo.phone = user.phone;
        if (finalEmail) ngo.email = finalEmail;
        if (req.body.registeredAddress) ngo.registeredAddress = req.body.registeredAddress;
        if (req.body.authorizedPerson) ngo.contactPerson = req.body.authorizedPerson;
        if (req.body.designation) ngo.designation = req.body.designation;
        if (req.body.about) ngo.about = req.body.about;
        if (req.body.ngoType) ngo.ngoType = req.body.ngoType;
        if (req.body.logo) ngo.logo = req.body.logo;
        if (req.body.bankAccountHolder) ngo.bankAccountHolder = req.body.bankAccountHolder;
        if (req.body.bankName) ngo.bankName = req.body.bankName;
        if (req.body.bankBranch) ngo.bankBranch = req.body.bankBranch;
        if (req.body.bankAccountNumber) ngo.bankAccountNumber = req.body.bankAccountNumber;
        if (req.body.bankIFSC) ngo.bankIFSC = req.body.bankIFSC.toUpperCase();
        if (req.body.panNumber) ngo.panNumber = req.body.panNumber;
        if (req.body.panImage) ngo.panImage = req.body.panImage;
        if (req.body.tanNumber) ngo.tanNumber = req.body.tanNumber;
        if (req.body.tanImage) ngo.tanImage = req.body.tanImage;
        if (req.body.gstNumber) ngo.gstNumber = req.body.gstNumber;
        if (req.body.gstDocument) ngo.gstDocument = req.body.gstDocument;
        if (req.body.registration12A) ngo.registration12A = req.body.registration12A;
        if (req.body.certificate12A) ngo.certificate12A = req.body.certificate12A;
        if (req.body.registration80G) ngo.registration80G = req.body.registration80G;
        if (req.body.certificate80G) ngo.certificate80G = req.body.certificate80G;
        if (req.body.darpanNumber) ngo.darpanNumber = req.body.darpanNumber;
        if (req.body.darpanCertificate) ngo.darpanCertificate = req.body.darpanCertificate;
        if (req.body.organizationType) ngo.organizationType = req.body.organizationType;
        if (req.body.addressCertificate) ngo.addressCertificate = req.body.addressCertificate;

        const extraFields = [
          'legalName', 'briefProfile', 'organizationType', 'isRegisteredNonProfit', 'isRegisteredCompany',
          'addressCertificate', 'moaAoaDocs', 'has12A', 'has80G', 'hasDarpan', 'hasCSR1', 'csr1Number', 'csr1Certificate',
          'hasFCRA', 'fcraNumber', 'fcraCertificate', 'websiteUrl', 'cancelledChequeDoc',
          'directorsKeyManagement', 'formFillerDetails', 'lastFinancialYearBudget', 'donorDatabaseStrength',
          'employeeStrength', 'hasCrowdfundedBefore', 'crowdfundingPlatformsUsed', 'campaignPlanningTimeframe',
          'purposeOfFundraising', 'csrObligation', 'csrAmountSpentPreviousYear', 'csrFocusAreas',
          'fundingPreferences', 'csrOfficerDetails', 'awardsRecognitions', 'declarations'
        ];
        extraFields.forEach(f => {
          if (req.body[f] !== undefined) ngo[f] = req.body[f];
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

    const fullData = await constructFullUserData(user);

    try {
      const { createAndSendNotification } = require('../utils/notification');
      await createAndSendNotification({
        userId: user._id,
        title: 'Welcome to Divine Platform! 🙏',
        body: `Welcome ${user.name || 'User'}! Your profile registration as ${user.role || 'donor'} has been completed successfully.`,
        type: 'registration',
        screen: 'home'
      });
    } catch (notifErr) {
      console.error('Registration notification error:', notifErr.message);
    }

    res.json({
      status: true,
      success: true,
      message: 'Registration completed successfully',
      isProfileComplete: !!fullData?.isProfileComplete,
      verified: !!fullData?.verified,
      verificationStatus: fullData?.verificationStatus || (user.status === 'Verified' ? 'Verified' : (user.status === 'Rejected' ? 'Rejected' : 'Pending')),
      rejectionReason: fullData?.rejectionReason || user.rejectionReason || '',
      canResubmit: !!fullData?.canResubmit,
      data: fullData
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
module.exports.handleTestNotification = handleTestNotification;
