const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');

// Utility to generate unique referral code
const generateReferralCode = (name) => {
  const prefix = name ? name.slice(0, 4).toUpperCase() : 'DIVINE';
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randNum}`;
};

// Get profile
router.get('/profile', async (req, res) => {
  try {
    let user = await User.findById(req.user._id)
      .populate('followingNgos', 'name organizationName logo')
      .populate('followingUsers', 'name phone profilePhoto')
      .populate('followers', 'name phone profilePhoto');
    
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.name);
      await user.save();
    }

    const Review = require('../../models/Review');

    // Fetch approved reviews for or by this donor
    const reviews = await Review.find({
      $or: [
        { userName: user.name },
        { targetName: { $regex: new RegExp(`^${user.name}$`, 'i') } }
      ],
      status: 'Approved'
    }).sort({ createdAt: -1 });

    const formattedReviews = reviews.map(r => ({
      reviewId: r.reviewId,
      userName: r.userName,
      userRole: r.userRole,
      rating: r.rating,
      comment: r.comment,
      videoUrl: r.videoUrl || '',
      createdAt: r.createdAt
    }));

    const followersCount = (user.followers || []).length;
    const userObj = user.toObject();

    const enrichedData = {
      ...userObj,
      rating: 5.0,
      reviewCount: reviews.length,
      reviews: formattedReviews,
      followersCount,
      followers: userObj.followers || [],
      impact: userObj.impactStats || 'Active community contributor & donor.',
      impactStats: userObj.impactStats || 'Active community contributor & donor.',
      years: userObj.years || '3 Years'
    };

    res.json({
      status: true,
      data: enrichedData,
      ...enrichedData
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const { name, email, gender, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (gender !== undefined) user.gender = gender;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    
    if (user.name && user.email) {
      user.isProfileComplete = true;
    }
    
    await user.save();
    
    const notification = new Notification({
      user: user._id,
      title: 'Profile Updated',
      message: 'Your profile details have been successfully updated!'
    });
    await notification.save();
    
    res.json({ status: true, message: 'Profile updated successfully', data: user });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Deactivate account
router.post('/deactivate', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    
    const { deletePermanently } = req.body;
    
    if (deletePermanently) {
      await User.findByIdAndDelete(req.user._id);
      return res.json({ status: true, message: 'Account permanently deleted' });
    } else {
      user.isProfileComplete = false;
      await user.save();
      return res.json({ status: true, message: 'Account successfully deactivated' });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
