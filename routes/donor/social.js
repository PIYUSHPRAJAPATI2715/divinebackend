const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const NGO = require('../../models/NGO');

// Get social network and leaderboards
router.get('/social', async (req, res) => {
  try {
    const topDonors = await User.find({ role: 'donor' })
      .select('name email phone walletBalance profilePhoto')
      .sort({ walletBalance: -1 })
      .limit(10);
    
    const topNgos = await NGO.find({ status: 'Verified' })
      .sort({ verifiedCampaignsCount: -1 })
      .limit(10);
    
    const me = await User.findById(req.user._id)
      .populate('followingNgos', 'name logo contactPerson phone')
      .populate('followingUsers', 'name phone profilePhoto')
      .populate('followers', 'name phone profilePhoto');
      
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
      
    res.json({
      status: true,
      data: {
        topDonors,
        topNgos,
        followingNgos: me.followingNgos || [],
        followingUsers: me.followingUsers || [],
        followers: me.followers || []
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Follow/unfollow NGO
router.post('/follow/ngo/:id', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const ngoId = req.params.id;
    const ngo = await NGO.findById(ngoId);
    if (!ngo) {
      return res.status(404).json({ status: false, message: 'NGO not found' });
    }
    
    const isFollowing = user.followingNgos.includes(ngoId);
    if (isFollowing) {
      user.followingNgos = user.followingNgos.filter(id => id.toString() !== ngoId);
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

// Follow/unfollow individual User
router.post('/follow/user/:id', async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const targetId = req.params.id;
    
    if (me._id.toString() === targetId) {
      return res.status(400).json({ status: false, message: 'You cannot follow yourself' });
    }
    
    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }
    
    const isFollowing = me.followingUsers.includes(targetId);
    if (isFollowing) {
      me.followingUsers = me.followingUsers.filter(id => id.toString() !== targetId);
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
