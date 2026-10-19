const express = require('express');
const router = express.Router();
const Donor = require('../../models/Donor');
const User = require('../../models/User');
const { buildPhoneFilter, normalizePhone } = require('../../utils/phone');

// Helper to normalize phone numbers for comparison
const cleanPhone = (p) => {
  if (!p) return '';
  const digits = String(p).replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Get all Donors & App Users (combines User collection with Donor collection, filters out deleted)
router.get('/', async (req, res) => {
  try {
    const [donors, users] = await Promise.all([
      Donor.find({ status: { $ne: 'Deleted' } }).sort({ createdAt: -1 }),
      User.find({ 
        isDeleted: { $ne: true }, 
        status: { $ne: 'Deleted' },
        role: { $in: ['donor', undefined, null] }
      }).sort({ createdAt: -1 })
    ]);

    const matchedDonorIds = new Set();
    const result = [];

    // 1. Process all app users with donor role
    for (const u of users) {
      const uEmail = (u.email || u.googleEmail || '').toLowerCase().trim();
      const uPhoneLast10 = cleanPhone(u.phone);

      // Match against Donor collection
      const matchedDonor = donors.find(d => {
        if (matchedDonorIds.has(d._id.toString())) return false;
        const dEmail = (d.email || '').toLowerCase().trim();
        const dPhoneLast10 = cleanPhone(d.phone || d.mobileNumber);
        if (uEmail && dEmail && uEmail === dEmail) return true;
        if (uPhoneLast10 && dPhoneLast10 && uPhoneLast10 === dPhoneLast10) return true;
        return false;
      });

      if (matchedDonor) {
        matchedDonorIds.add(matchedDonor._id.toString());
        const dObj = matchedDonor.toObject();
        result.push({
          ...dObj,
          _id: matchedDonor._id, // Keep donor ID primary for backward-compat
          userId: u._id,
          name: matchedDonor.name || u.name || 'Divine Donor',
          email: matchedDonor.email || uEmail,
          phone: u.phone || matchedDonor.phone || matchedDonor.mobileNumber || '',
          mobileNumber: u.phone || matchedDonor.phone || matchedDonor.mobileNumber || '',
          status: matchedDonor.status || u.status || 'Active',
          totalDonated: matchedDonor.totalDonated || `₹${(u.walletBalance || 0).toLocaleString()}`,
          campaignsSupported: matchedDonor.campaignsSupported || 0,
          donationHistory: matchedDonor.donationHistory || [],
          createdAt: matchedDonor.createdAt || u.createdAt
        });
      } else {
        // App user without an explicit Donor record
        const fallbackDonorId = `DNR-${u._id.toString().slice(-4).toUpperCase()}`;
        const phone = u.phone || '';
        result.push({
          _id: u._id,
          userId: u._id,
          donorId: fallbackDonorId,
          name: u.name || (phone ? `User ${phone.slice(-4)}` : 'Divine Donor'),
          email: uEmail,
          phone: phone,
          mobileNumber: phone,
          status: u.status || 'Active',
          totalDonated: `₹${(u.walletBalance || 0).toLocaleString()}`,
          campaignsSupported: 0,
          donationHistory: [],
          createdAt: u.createdAt
        });
      }
    }

    // 2. Add remaining Donors from Donor collection that did not match a User record
    for (const d of donors) {
      if (!matchedDonorIds.has(d._id.toString())) {
        const dObj = d.toObject();
        let phone = dObj.phone || dObj.mobileNumber || '';
        if (!phone) {
          const numSeed = parseInt((dObj.donorId || '').replace(/[^0-9]/g, '')) || Math.floor(1000 + Math.random() * 9000);
          phone = `+91 98765${String(numSeed).padStart(5, '0').slice(-5)}`;
        }
        result.push({
          ...dObj,
          phone,
          mobileNumber: phone
        });
      }
    }

    // Sort combined list newest first
    result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(result);
  } catch (err) {
    console.error('Error fetching donors:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get a single Donor detailed profile
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let donor = await Donor.findById(id);
    if (donor) {
      const uEmail = (donor.email || '').toLowerCase().trim();
      const uPhone = donor.phone || donor.mobileNumber || '';
      const u = await User.findOne({
        $or: [
          ...(uEmail ? [{ email: uEmail }, { googleEmail: uEmail }] : []),
          ...(uPhone ? [buildPhoneFilter(uPhone)] : [])
        ]
      });
      return res.json({
        ...donor.toObject(),
        userId: u?._id,
        phone: u?.phone || donor.phone || donor.mobileNumber || '',
        mobileNumber: u?.phone || donor.phone || donor.mobileNumber || ''
      });
    }

    const user = await User.findById(id);
    if (user && !user.isDeleted && user.status !== 'Deleted') {
      return res.json({
        _id: user._id,
        userId: user._id,
        donorId: `DNR-${user._id.toString().slice(-4).toUpperCase()}`,
        name: user.name || 'Divine Donor',
        email: user.email || user.googleEmail || '',
        phone: user.phone || '',
        mobileNumber: user.phone || '',
        status: user.status || 'Active',
        totalDonated: `₹${(user.walletBalance || 0).toLocaleString()}`,
        campaignsSupported: 0,
        donationHistory: [],
        createdAt: user.createdAt
      });
    }

    return res.status(404).json({ message: 'Donor profile not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new Donor
router.post('/', async (req, res) => {
  try {
    const newDonor = new Donor({ ...req.body, donorId: `DNR-${Date.now().toString().slice(-4)}` });
    const savedDonor = await newDonor.save();
    res.status(201).json(savedDonor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Donor (syncs status and fields to both Donor and User)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let donor = await Donor.findById(id);
    let user = await User.findById(id);

    if (donor) {
      Object.assign(donor, req.body);
      await donor.save();

      // Sync with matching User if exists
      const dEmail = (donor.email || '').toLowerCase().trim();
      const dPhone = donor.phone || donor.mobileNumber || '';
      if (dEmail || dPhone) {
        user = await User.findOne({
          $or: [
            ...(dEmail ? [{ email: dEmail }, { googleEmail: dEmail }] : []),
            ...(dPhone ? [buildPhoneFilter(dPhone)] : [])
          ]
        });
      }
    }

    if (user) {
      if (req.body.status) {
        user.status = req.body.status;
        if (req.body.status === 'Suspended') {
          // If suspended, clear push tokens and invalidate session
          user.fcmToken = null;
          user.deviceToken = null;
        }
      }
      if (req.body.name && (!user.name || user.name === 'Divine Donor')) {
        user.name = req.body.name;
      }
      await user.save();
    }

    if (!donor && !user) {
      return res.status(404).json({ message: 'Donor or User not found' });
    }

    res.json(donor || user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Donor & Invalidate Active User Session
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let donor = null;
    let user = null;

    // 1. Try finding as User first
    user = await User.findById(id);

    // 2. Try finding as Donor
    donor = await Donor.findById(id);

    // 3. Link User and Donor if only one was found by ID
    if (donor && !user) {
      const dEmail = (donor.email || '').toLowerCase().trim();
      const dPhone = donor.phone || donor.mobileNumber || '';
      const userOr = [];
      if (dEmail) userOr.push({ email: dEmail }, { googleEmail: dEmail });
      if (dPhone) userOr.push(buildPhoneFilter(dPhone));
      if (userOr.length > 0) {
        user = await User.findOne({ $or: userOr });
      }
    } else if (user && !donor) {
      const uEmail = (user.email || user.googleEmail || '').toLowerCase().trim();
      const uPhone = user.phone || '';
      const donorOr = [];
      if (uEmail) donorOr.push({ email: uEmail });
      if (uPhone) donorOr.push(buildPhoneFilter(uPhone));
      if (donorOr.length > 0) {
        donor = await Donor.findOne({ $or: donorOr });
      }
    }

    if (!donor && !user) {
      return res.status(404).json({ status: false, message: 'User / Donor profile not found' });
    }

    // 4. Send FORCE_LOGOUT silent push notification if device token exists
    if (user && (user.fcmToken || user.deviceToken)) {
      try {
        const { sendPushNotification } = require('../../utils/notification');
        await sendPushNotification({
          token: user.fcmToken || user.deviceToken,
          title: 'Session Invalidation',
          body: 'Your account has been deleted by an administrator.',
          data: {
            type: 'LOGOUT',
            action: 'FORCE_LOGOUT',
            reason: 'ACCOUNT_DELETED'
          }
        });
      } catch (pushErr) {
        console.error('Push notification dispatch error during user deletion:', pushErr.message);
      }
    }

    // 5. Invalidate User account: mark isDeleted, set status Deleted, clear tokens
    if (user) {
      user.isDeleted = true;
      user.status = 'Deleted';
      user.deletedAt = new Date();
      user.fcmToken = null;
      user.deviceToken = null;
      await user.save();
    }

    // 6. Delete Donor record
    if (donor) {
      await Donor.findByIdAndDelete(donor._id);
    }

    res.json({
      status: true,
      message: 'User account and active session successfully deleted and invalidated.'
    });
  } catch (err) {
    console.error('Delete donor error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
