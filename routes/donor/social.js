const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const NGO = require('../../models/NGO');

// 1. Get Social Overview (Leaderboard, Top NGOs, My Followers & Following)
router.get('/social', async (req, res) => {
  try {
    const topDonors = await User.find({ role: 'donor' })
      .select('name email phone walletBalance profilePhoto')
      .sort({ walletBalance: -1 })
      .limit(10);
    
    const topNgos = await NGO.find({ status: 'Verified' })
      .sort({ verifiedCampaignsCount: -1 })
      .limit(10);
    
    const me = await User.findById(req.user._id || req.user.id)
      .populate('followingNgos', 'name organizationName logo contactPerson phone registeredAddress')
      .populate('followingUsers', 'name phone profilePhoto email role')
      .populate('followers', 'name phone profilePhoto email role');
      
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const followersList = (me.followers || []).map(f => ({
      _id: f._id,
      id: f._id,
      name: f.name || 'Anonymous User',
      phone: f.phone || '',
      profilePhoto: f.profilePhoto || f.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      email: f.email || '',
      role: f.role || 'donor'
    }));

    const followingNgosList = (me.followingNgos || []).map(n => ({
      _id: n._id,
      id: n._id,
      name: n.name || n.organizationName || 'NGO',
      organizationName: n.organizationName || n.name || 'NGO',
      logo: n.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      profilePhoto: n.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      contactPerson: n.contactPerson || '',
      phone: n.phone || '',
      type: 'ngo',
      isFollowing: true
    }));

    const followingUsersList = (me.followingUsers || []).map(u => ({
      _id: u._id,
      id: u._id,
      name: u.name || 'User',
      phone: u.phone || '',
      profilePhoto: u.profilePhoto || 'https://files.catbox.moe/q4i0t0.jpg',
      type: 'user',
      isFollowing: true
    }));

    res.json({
      status: true,
      data: {
        topDonors,
        topNgos,
        suggestedNgos: topNgos,
        followingNgos: followingNgosList,
        followingUsers: followingUsersList,
        followers: followersList,
        followersCount: followersList.length,
        followingCount: followingNgosList.length + followingUsersList.length
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 2. Dedicated Followers Endpoint Handler
const handleFollowers = async (req, res) => {
  try {
    const me = await User.findById(req.user._id || req.user.id)
      .populate('followers', 'name phone profilePhoto email role');
      
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const followersList = (me.followers || []).map(f => ({
      _id: f._id,
      id: f._id,
      name: f.name || 'Anonymous User',
      phone: f.phone || '',
      profilePhoto: f.profilePhoto || f.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      email: f.email || '',
      role: f.role || 'donor'
    }));

    res.json({
      status: true,
      followersCount: followersList.length,
      count: followersList.length,
      data: followersList,
      followers: followersList,
      ngos: [],
      users: followersList,
      individuals: followersList
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// 3. Dedicated Following Endpoint Handler
const handleFollowing = async (req, res) => {
  try {
    const me = await User.findById(req.user._id || req.user.id)
      .populate('followingNgos', 'name organizationName logo contactPerson phone registeredAddress')
      .populate('followingUsers', 'name phone profilePhoto email role');
      
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }

    const followingNgosList = (me.followingNgos || []).map(n => ({
      _id: n._id,
      id: n._id,
      name: n.name || n.organizationName || 'NGO',
      organizationName: n.organizationName || n.name || 'NGO',
      logo: n.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      profilePhoto: n.logo || 'https://files.catbox.moe/q4i0t0.jpg',
      contactPerson: n.contactPerson || '',
      phone: n.phone || '',
      type: 'ngo',
      isFollowing: true
    }));

    const followingUsersList = (me.followingUsers || []).map(u => ({
      _id: u._id,
      id: u._id,
      name: u.name || 'User',
      phone: u.phone || '',
      profilePhoto: u.profilePhoto || 'https://files.catbox.moe/q4i0t0.jpg',
      type: 'user',
      isFollowing: true
    }));

    const allFollowing = [...followingNgosList, ...followingUsersList];

    res.json({
      status: true,
      followingCount: allFollowing.length,
      count: allFollowing.length,
      data: allFollowing,
      following: allFollowing,
      followingNgos: followingNgosList,
      followingUsers: followingUsersList,
      ngos: followingNgosList,
      users: followingUsersList
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

router.get('/followers', handleFollowers);
router.get('/following', handleFollowing);
router.get('/', (req, res, next) => {
  if (req.baseUrl.includes('followers')) return handleFollowers(req, res);
  if (req.baseUrl.includes('following')) return handleFollowing(req, res);
  return next();
});

// 4. Follow/unfollow NGO
router.post('/follow/ngo/:id', async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const ngoId = req.params.id;
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ status: false, message: 'NGO not found' });
    }
    
    if (!user.followingNgos) user.followingNgos = [];

    const isFollowing = user.followingNgos.map(id => id.toString()).includes(ngoId.toString());
    if (isFollowing) {
      user.followingNgos = user.followingNgos.filter(id => id.toString() !== ngoId.toString());
    } else {
      user.followingNgos.push(ngoId);
    }
    await user.save();
    
    res.json({
      status: true,
      message: isFollowing ? 'Unfollowed NGO successfully' : 'Followed NGO successfully',
      isFollowing: !isFollowing
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Follow/unfollow individual User
router.post('/follow/user/:id', async (req, res) => {
  try {
    const me = await User.findById(req.user._id || req.user.id);
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const targetId = req.params.id;
    
    if (me._id.toString() === targetId.toString()) {
      return res.status(400).json({ status: false, message: 'You cannot follow yourself' });
    }
    
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    if (!me.followingUsers) me.followingUsers = [];
    if (!targetUser.followers) targetUser.followers = [];
    
    const isFollowing = me.followingUsers.map(id => id.toString()).includes(targetId.toString());
    if (isFollowing) {
      me.followingUsers = me.followingUsers.filter(id => id.toString() !== targetId.toString());
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== me._id.toString());
    } else {
      me.followingUsers.push(targetId);
      targetUser.followers.push(me._id);
    }
    
    await me.save();
    await targetUser.save();
    
    res.json({
      status: true,
      message: isFollowing ? 'Unfollowed user successfully' : 'Followed user successfully',
      isFollowing: !isFollowing
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
module.exports.handleFollowers = handleFollowers;
module.exports.handleFollowing = handleFollowing;
