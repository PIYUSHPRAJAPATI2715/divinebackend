const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const NGO = require('../../models/NGO');
const { resolveEntityPhoto } = require('../../utils/avatar');

// Helper to get set of all IDs user is following
function getUserFollowingIds(user) {
  if (!user) return new Set();
  const set = new Set();
  (user.followingNgos || []).forEach(id => set.add(id._id ? id._id.toString() : id.toString()));
  (user.followingUsers || []).forEach(id => set.add(id._id ? id._id.toString() : id.toString()));
  return set;
}

// 1. Get Social Overview (Leaderboard, Top NGOs with dynamic isFollowing)
router.get('/social', async (req, res) => {
  try {
    let me = null;
    if (req.user) {
      me = await User.findById(req.user._id || req.user.id)
        .populate('followingNgos', 'name organizationName logo contactPerson phone registeredAddress')
        .populate('followingUsers', 'name phone profilePhoto email role logo')
        .populate('followers', 'name phone profilePhoto email role logo');
    }

    const followingSet = getUserFollowingIds(me);

    const rawTopDonors = await User.find({ role: 'donor' })
      .select('name email phone walletBalance profilePhoto logo')
      .sort({ walletBalance: -1 })
      .limit(10);
    
    const topDonors = rawTopDonors.map(d => {
      const photo = resolveEntityPhoto(d, 'user');
      return {
        _id: d._id,
        id: d._id,
        name: d.name || 'Donor',
        phone: d.phone || '',
        email: d.email || '',
        walletBalance: d.walletBalance || 0,
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        isFollowing: followingSet.has(d._id.toString())
      };
    });

    let selfNgoId = null;
    if (me) {
      const myNgo = await NGO.findOne({
        $or: [
          { phone: me.phone },
          { email: me.email }
        ]
      });
      if (myNgo) selfNgoId = myNgo._id;
    }

    const ngoQuery = {
      status: 'Verified',
      organizationType: { $ne: 'Corporate' },
      isRegisteredCompany: { $ne: 'Yes' }
    };
    if (selfNgoId) {
      ngoQuery._id = { $ne: selfNgoId };
    }
    if (me && me.phone && me.phone.trim()) {
      ngoQuery.phone = { $ne: me.phone.trim() };
    }
    if (me && me.email && me.email.trim()) {
      ngoQuery.email = { $ne: me.email.trim() };
    }

    const rawTopNgos = await NGO.find(ngoQuery)
      .sort({ verifiedCampaignsCount: -1, rating: -1 })
      .limit(10);

    const topNgos = rawTopNgos.map(n => {
      const photo = resolveEntityPhoto(n, 'ngo');
      return {
        _id: n._id,
        id: n._id,
        name: n.name || n.organizationName || 'NGO',
        organizationName: n.organizationName || n.name || 'NGO',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        contactPerson: n.contactPerson || '',
        phone: n.phone || '',
        about: n.about || '',
        rating: n.rating || 4.5,
        verifiedCampaignsCount: n.verifiedCampaignsCount || 0,
        isFollowing: followingSet.has(n._id.toString())
      };
    });

    const followersList = ((me && me.followers) || []).map(f => {
      const photo = resolveEntityPhoto(f, f.role === 'ngo' ? 'ngo' : 'user');
      return {
        _id: f._id,
        id: f._id,
        name: f.name || 'Anonymous User',
        phone: f.phone || '',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        email: f.email || '',
        role: f.role || 'donor',
        isFollower: true,
        isFollowing: followingSet.has(f._id.toString())
      };
    });

    const followingNgosList = ((me && me.followingNgos) || []).filter(Boolean).map(n => {
      const photo = resolveEntityPhoto(n, 'ngo');
      return {
        _id: n._id,
        id: n._id,
        name: n.name || n.organizationName || 'NGO',
        organizationName: n.organizationName || n.name || 'NGO',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        contactPerson: n.contactPerson || '',
        phone: n.phone || '',
        type: 'ngo',
        isFollowing: true
      };
    });

    const followingUsersList = ((me && me.followingUsers) || []).filter(Boolean).map(u => {
      const photo = resolveEntityPhoto(u, 'user');
      return {
        _id: u._id,
        id: u._id,
        name: u.name || 'User',
        phone: u.phone || '',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        type: 'user',
        isFollowing: true
      };
    });

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

// 2. Dedicated Followers Handler (Shows users following me, with isFollowing back state)
const handleFollowers = async (req, res) => {
  try {
    let me = null;
    if (req.user && (req.user._id || req.user.id)) {
      me = await User.findById(req.user._id || req.user.id)
        .populate('followers', 'name phone profilePhoto email role logo');
    }

    const followingSet = getUserFollowingIds(me);

    const followersList = ((me && me.followers) || []).filter(Boolean).map(f => {
      const photo = resolveEntityPhoto(f, f.role === 'ngo' ? 'ngo' : 'user');
      return {
        _id: f._id,
        id: f._id,
        name: f.name || 'Anonymous User',
        phone: f.phone || '',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        email: f.email || '',
        role: f.role || 'donor',
        isFollower: true,
        isFollowing: followingSet.has(f._id.toString())
      };
    });

    res.json({
      status: true,
      followersCount: followersList.length,
      count: followersList.length,
      data: followersList,
      followers: followersList,
      ngos: followersList.filter(f => f.role === 'ngo'),
      users: followersList,
      individuals: followersList
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// 3. Dedicated Following Handler (Shows NGOs and Users I am following)
const handleFollowing = async (req, res) => {
  try {
    let me = null;
    if (req.user && (req.user._id || req.user.id)) {
      me = await User.findById(req.user._id || req.user.id)
        .populate('followingNgos', 'name organizationName logo contactPerson phone registeredAddress rating verifiedCampaignsCount')
        .populate('followingUsers', 'name phone profilePhoto email role logo');
    }

    const followingNgosList = ((me && me.followingNgos) || [])
      .filter(Boolean)
      .map(n => {
        const photo = resolveEntityPhoto(n, 'ngo');
        return {
          _id: n._id,
          id: n._id,
          name: n.name || n.organizationName || 'NGO',
          organizationName: n.organizationName || n.name || 'NGO',
          logo: photo,
          profilePhoto: photo,
          profileImage: photo,
          imageUrl: photo,
          image: photo,
          avatar: photo,
          photo: photo,
          userImage: photo,
          contactPerson: n.contactPerson || '',
          phone: n.phone || '',
          rating: n.rating || 4.5,
          type: 'ngo',
          isFollowing: true
        };
      });

    const followingUsersList = ((me && me.followingUsers) || [])
      .filter(Boolean)
      .map(u => {
        const photo = resolveEntityPhoto(u, 'user');
        return {
          _id: u._id,
          id: u._id,
          name: u.name || 'User',
          phone: u.phone || '',
          logo: photo,
          profilePhoto: photo,
          profileImage: photo,
          imageUrl: photo,
          image: photo,
          avatar: photo,
          photo: photo,
          userImage: photo,
          email: u.email || '',
          role: u.role || 'donor',
          type: 'user',
          isFollowing: true
        };
      });

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
      users: followingUsersList,
      individuals: followingUsersList
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

// 4. Discover / Suggested NGOs & Users to Follow (with isFollowing status for each)
router.get('/discover', async (req, res) => {
  try {
    let me = null;
    if (req.user) {
      me = await User.findById(req.user._id || req.user.id);
    }
    const followingSet = getUserFollowingIds(me);

    let selfNgoId = null;
    if (me) {
      const myNgo = await NGO.findOne({
        $or: [
          { phone: me.phone },
          { email: me.email }
        ]
      });
      if (myNgo) selfNgoId = myNgo._id;
    }

    const discoverNgoQuery = {
      status: 'Verified',
      organizationType: { $ne: 'Corporate' },
      isRegisteredCompany: { $ne: 'Yes' }
    };
    if (selfNgoId) discoverNgoQuery._id = { $ne: selfNgoId };
    if (me && me.phone && me.phone.trim()) discoverNgoQuery.phone = { $ne: me.phone.trim() };
    if (me && me.email && me.email.trim()) discoverNgoQuery.email = { $ne: me.email.trim() };

    const ngos = await NGO.find(discoverNgoQuery).sort({ verifiedCampaignsCount: -1, rating: -1 });
    const formattedNgos = ngos.map(n => {
      const photo = resolveEntityPhoto(n, 'ngo');
      return {
        _id: n._id,
        id: n._id,
        name: n.name || n.organizationName,
        organizationName: n.organizationName || n.name,
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        rating: n.rating || 4.5,
        type: 'ngo',
        isFollowing: followingSet.has(n._id.toString())
      };
    });

    const users = await User.find({ role: 'donor', _id: { $ne: me?._id } }).limit(20);
    const formattedUsers = users.map(u => {
      const photo = resolveEntityPhoto(u, 'user');
      return {
        _id: u._id,
        id: u._id,
        name: u.name || 'User',
        phone: u.phone || '',
        logo: photo,
        profilePhoto: photo,
        profileImage: photo,
        imageUrl: photo,
        image: photo,
        avatar: photo,
        photo: photo,
        userImage: photo,
        type: 'user',
        isFollowing: followingSet.has(u._id.toString())
      };
    });

    res.json({
      status: true,
      ngos: formattedNgos,
      users: formattedUsers,
      suggestedNgos: formattedNgos,
      suggestedUsers: formattedUsers
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 5. Follow Check Status Endpoint
router.get('/follow/check/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ status: true, targetId: req.params.id, isFollowing: false });
    }
    const me = await User.findById(req.user._id || req.user.id);
    const targetId = req.params.id;
    const followingSet = getUserFollowingIds(me);
    const isFollowing = followingSet.has(targetId.toString());

    res.json({
      status: true,
      targetId,
      isFollowing,
      followingCount: (me?.followingNgos || []).length + (me?.followingUsers || []).length,
      followersCount: (me?.followers || []).length
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 6. Unified Follow/Unfollow Toggle (Auto-detects NGO vs User by ID)
router.post('/follow/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }
    const me = await User.findById(req.user._id || req.user.id);
    if (!me) {
      return res.status(401).json({ status: false, message: 'User not found' });
    }
    const targetId = req.params.id;

    if (me._id.toString() === targetId.toString()) {
      return res.status(400).json({ status: false, message: 'You cannot follow yourself' });
    }

    // Try finding in NGO collection
    const ngo = await NGO.findById(targetId);
    if (ngo) {
      if (!me.followingNgos) me.followingNgos = [];
      const isFollowing = me.followingNgos.map(id => id.toString()).includes(targetId.toString());
      if (isFollowing) {
        me.followingNgos = me.followingNgos.filter(id => id.toString() !== targetId.toString());
      } else {
        me.followingNgos.push(targetId);
      }
      await me.save();
      return res.json({
        status: true,
        type: 'ngo',
        message: isFollowing ? 'Unfollowed NGO successfully' : 'Followed NGO successfully',
        isFollowing: !isFollowing
      });
    }

    // Try finding in User collection
    const targetUser = await User.findById(targetId);
    if (targetUser) {
      if (!me.followingUsers) me.followingUsers = [];
      if (!targetUser.followers) targetUser.followers = [];

      const isFollowing = me.followingUsers.map(id => id.toString()).includes(targetId.toString());
      if (isFollowing) {
        me.followingUsers = me.followingUsers.filter(id => id.toString() !== targetId.toString());
        targetUser.followers = targetUser.followers.filter(id => id.toString() !== me._id.toString());
      } else {
        me.followingUsers.push(targetId);
        targetUser.followers.push(me._id);

        try {
          const { createAndSendNotification } = require('../../utils/notification');
          await createAndSendNotification({
            userId: targetUser._id,
            title: 'New Follower Alert! 👤',
            body: `${me.name || 'Someone'} started following you on Divine Platform.`,
            type: 'social',
            screen: 'profile',
            dataId: String(me._id)
          });
        } catch (notifErr) {
          console.error('Follow notification error:', notifErr.message);
        }
      }
      await me.save();
      await targetUser.save();
      return res.json({
        status: true,
        type: 'user',
        message: isFollowing ? 'Unfollowed user successfully' : 'Followed user successfully',
        isFollowing: !isFollowing
      });
    }

    return res.status(404).json({ status: false, message: 'Target NGO or User not found' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// 7. Follow/unfollow NGO explicit endpoint
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

// 8. Follow/unfollow individual User explicit endpoint
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
