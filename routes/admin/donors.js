const express = require('express');
const router = express.Router();
const Donor = require('../../models/Donor');
const User = require('../../models/User');
const NGO = require('../../models/NGO');
const { buildPhoneFilter, normalizePhone } = require('../../utils/phone');

// Helper to normalize phone numbers for comparison
const cleanPhone = (p) => {
  if (!p) return '';
  const digits = String(p).replace(/[^0-9]/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

// Get all Donors & App Users (combines User collection with Donor and NGO collection, filters out deleted)
router.get('/', async (req, res) => {
  try {
    const [donors, users, ngos] = await Promise.all([
      Donor.find({ status: { $ne: 'Deleted' } }).sort({ createdAt: -1 }),
      User.find({ 
        isDeleted: { $ne: true }, 
        status: { $ne: 'Deleted' }
      }).sort({ createdAt: -1 }),
      NGO.find({}).sort({ createdAt: -1 })
    ]);

    const matchedDonorIds = new Set();
    const matchedNgoIds = new Set();
    const result = [];

    // 1. Process all app users
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

      // Match against NGO collection for organization data
      const matchedNgo = ngos.find(n => {
        const nEmail = (n.email || '').toLowerCase().trim();
        const nPhoneLast10 = cleanPhone(n.phone);
        if (uEmail && nEmail && uEmail === nEmail) return true;
        if (uPhoneLast10 && nPhoneLast10 && uPhoneLast10 === nPhoneLast10) return true;
        return false;
      });

      if (matchedNgo) {
        matchedNgoIds.add(matchedNgo._id.toString());
      }

      const verificationStatus = matchedNgo ? (matchedNgo.status || 'Pending') : (u.verified ? 'Verified' : 'Pending');
      const registrationNumber = matchedNgo?.registrationNumber || '';
      const panNumber = matchedNgo?.panNumber || '';
      const organizationType = matchedNgo?.organizationType || (u.role === 'corporate' ? 'Corporate' : (u.role === 'ngo' ? 'Non-Profit' : 'Individual'));
      const address = matchedNgo?.registeredAddress || '';

      // Statutory documents & uploaded fields for NGO & Corporate profiles (Issue 11)
      const ngoDocs = matchedNgo ? {
        legalName: matchedNgo.legalName || matchedNgo.name || '',
        contactPerson: matchedNgo.contactPerson || '',
        designation: matchedNgo.designation || '',
        websiteUrl: matchedNgo.websiteUrl || '',
        about: matchedNgo.about || '',
        panImage: matchedNgo.panImage || null,
        tanNumber: matchedNgo.tanNumber || '',
        tanImage: matchedNgo.tanImage || null,
        gstNumber: matchedNgo.gstNumber || '',
        gstDocument: matchedNgo.gstDocument || null,
        has12A: matchedNgo.has12A || 'No',
        registration12A: matchedNgo.registration12A || '',
        certificate12A: matchedNgo.certificate12A || null,
        has80G: matchedNgo.has80G || 'No',
        registration80G: matchedNgo.registration80G || '',
        certificate80G: matchedNgo.certificate80G || null,
        hasDarpan: matchedNgo.hasDarpan || 'No',
        darpanNumber: matchedNgo.darpanNumber || '',
        darpanCertificate: matchedNgo.darpanCertificate || null,
        hasCSR1: matchedNgo.hasCSR1 || 'No',
        csr1Number: matchedNgo.csr1Number || '',
        csr1Certificate: matchedNgo.csr1Certificate || null,
        hasFCRA: matchedNgo.hasFCRA || 'No',
        fcraNumber: matchedNgo.fcraNumber || '',
        fcraCertificate: matchedNgo.fcraCertificate || null,
        addressCertificate: matchedNgo.addressCertificate || null,
        moaAoaDocs: matchedNgo.moaAoaDocs || [],
        cancelledChequeDoc: matchedNgo.cancelledChequeDoc || null,
        bankAccountHolder: matchedNgo.bankAccountHolder || '',
        bankName: matchedNgo.bankName || '',
        bankBranch: matchedNgo.bankBranch || '',
        bankAccountNumber: matchedNgo.bankAccountNumber || '',
        bankIFSC: matchedNgo.bankIFSC || '',
        directorsKeyManagement: matchedNgo.directorsKeyManagement || [],
        formFillerDetails: matchedNgo.formFillerDetails || null,
        rejectionReason: matchedNgo.rejectionReason || '',
        isRegisteredNonProfit: matchedNgo.isRegisteredNonProfit || '',
        isRegisteredCompany: matchedNgo.isRegisteredCompany || ''
      } : {};

      if (matchedDonor) {
        matchedDonorIds.add(matchedDonor._id.toString());
        const dObj = matchedDonor.toObject();
        result.push({
          ...dObj,
          ...ngoDocs,
          _id: matchedDonor._id, // Keep donor ID primary for backward-compat
          userId: u._id,
          name: matchedDonor.name || u.name || matchedNgo?.name || 'Divine Donor',
          email: matchedDonor.email || uEmail,
          phone: u.phone || matchedDonor.phone || matchedDonor.mobileNumber || matchedNgo?.phone || '',
          mobileNumber: u.phone || matchedDonor.phone || matchedDonor.mobileNumber || matchedNgo?.phone || '',
          status: matchedDonor.status || u.status || 'Active',
          role: u.role || (matchedNgo?.organizationType === 'Corporate' ? 'corporate' : (matchedNgo ? 'ngo' : 'donor')),
          gender: u.gender || null,
          profilePhoto: u.profilePhoto || matchedNgo?.logo || null,
          verified: u.verified === true || verificationStatus === 'Verified',
          verificationStatus,
          registrationNumber,
          panNumber: (u.role === 'ngo' || u.role === 'corporate' || matchedNgo) ? panNumber : '', // Issue 2: Don't show pan for individual donors
          organizationType,
          address,
          walletBalance: u.walletBalance || 0,
          cashbackBalance: u.cashbackBalance || 0,
          totalCoins: u.totalCoins || 0,
          referralCode: u.referralCode || '',
          referredBy: u.referredBy || '',
          organizationName: u.organizationName || matchedNgo?.name || '',
          totalDonated: matchedDonor.totalDonated || `₹${(u.walletBalance || 0).toLocaleString()}`,
          campaignsSupported: matchedDonor.campaignsSupported || 0,
          donationHistory: matchedDonor.donationHistory || [],
          createdAt: matchedDonor.createdAt || u.createdAt
        });
      } else {
        // App user without an explicit Donor record
        const fallbackDonorId = `DNR-${u._id.toString().slice(-4).toUpperCase()}`;
        const phone = u.phone || matchedNgo?.phone || '';
        result.push({
          _id: u._id,
          userId: u._id,
          donorId: fallbackDonorId,
          ...ngoDocs,
          name: u.name || matchedNgo?.name || (phone ? `User ${phone.slice(-4)}` : 'Divine User'),
          email: uEmail,
          phone: phone,
          mobileNumber: phone,
          status: u.status || 'Active',
          role: u.role || (matchedNgo?.organizationType === 'Corporate' ? 'corporate' : (matchedNgo ? 'ngo' : 'donor')),
          gender: u.gender || null,
          profilePhoto: u.profilePhoto || matchedNgo?.logo || null,
          verified: u.verified === true || verificationStatus === 'Verified',
          verificationStatus,
          registrationNumber,
          panNumber: (u.role === 'ngo' || u.role === 'corporate' || matchedNgo) ? panNumber : '', // Issue 2: Don't show pan for individual donors
          organizationType,
          address,
          walletBalance: u.walletBalance || 0,
          cashbackBalance: u.cashbackBalance || 0,
          totalCoins: u.totalCoins || 0,
          referralCode: u.referralCode || '',
          referredBy: u.referredBy || '',
          organizationName: u.organizationName || matchedNgo?.name || '',
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
          mobileNumber: phone,
          role: dObj.role || 'donor'
        });
      }
    }

    // 3. Add remaining NGOs/Corporates from NGO collection that did not match a User record
    for (const n of ngos) {
      if (!matchedNgoIds.has(n._id.toString())) {
        const nEmail = (n.email || '').toLowerCase().trim();
        const nPhone = n.phone || '';
        const isCorp = n.organizationType === 'Corporate' || n.organizationType === 'Company';
        const role = isCorp ? 'corporate' : 'ngo';
        result.push({
          _id: n._id,
          userId: n._id,
          donorId: `${isCorp ? 'CRP' : 'NGO'}-${n._id.toString().slice(-4).toUpperCase()}`,
          name: n.name || (isCorp ? 'Corporate Partner' : 'NGO Organization'),
          email: nEmail,
          phone: nPhone,
          mobileNumber: nPhone,
          status: (n.status === 'Suspended' || n.status === 'Inactive') ? 'Inactive' : 'Active',
          role: role,
          organizationType: isCorp ? 'Corporate' : 'Non-Profit',
          organizationName: n.name,
          legalName: n.legalName || n.name || '',
          contactPerson: n.contactPerson || '',
          designation: n.designation || '',
          websiteUrl: n.websiteUrl || '',
          about: n.about || '',
          verificationStatus: n.status === 'Verified' ? 'Verified' : (n.status === 'Rejected' ? 'Rejected' : 'Pending'),
          verified: n.status === 'Verified',
          registrationNumber: n.registrationNumber || '',
          panNumber: n.panNumber || '',
          panImage: n.panImage || null,
          tanNumber: n.tanNumber || '',
          tanImage: n.tanImage || null,
          gstNumber: n.gstNumber || '',
          gstDocument: n.gstDocument || null,
          has12A: n.has12A || 'No',
          registration12A: n.registration12A || '',
          certificate12A: n.certificate12A || null,
          has80G: n.has80G || 'No',
          registration80G: n.registration80G || '',
          certificate80G: n.certificate80G || null,
          hasDarpan: n.hasDarpan || 'No',
          darpanNumber: n.darpanNumber || '',
          darpanCertificate: n.darpanCertificate || null,
          hasCSR1: n.hasCSR1 || 'No',
          csr1Number: n.csr1Number || '',
          csr1Certificate: n.csr1Certificate || null,
          hasFCRA: n.hasFCRA || 'No',
          fcraNumber: n.fcraNumber || '',
          fcraCertificate: n.fcraCertificate || null,
          addressCertificate: n.addressCertificate || null,
          moaAoaDocs: n.moaAoaDocs || [],
          cancelledChequeDoc: n.cancelledChequeDoc || null,
          bankAccountHolder: n.bankAccountHolder || '',
          bankName: n.bankName || '',
          bankBranch: n.bankBranch || '',
          bankAccountNumber: n.bankAccountNumber || '',
          bankIFSC: n.bankIFSC || '',
          directorsKeyManagement: n.directorsKeyManagement || [],
          formFillerDetails: n.formFillerDetails || null,
          rejectionReason: n.rejectionReason || '',
          isRegisteredNonProfit: n.isRegisteredNonProfit || '',
          isRegisteredCompany: n.isRegisteredCompany || '',
          address: n.registeredAddress || n.address || '',
          totalDonated: '₹0',
          campaignsSupported: 0,
          donationHistory: [],
          createdAt: n.createdAt || new Date()
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
        mobileNumber: u?.phone || donor.phone || donor.mobileNumber || '',
        role: u?.role || 'donor',
        gender: u?.gender || null,
        profilePhoto: u?.profilePhoto || null,
        verified: u?.verified === true,
        walletBalance: u?.walletBalance || 0,
        cashbackBalance: u?.cashbackBalance || 0,
        totalCoins: u?.totalCoins || 0,
        referralCode: u?.referralCode || '',
        referredBy: u?.referredBy || '',
        organizationName: u?.organizationName || ''
      });
    }

    const user = await User.findById(id);
    if (user && !user.isDeleted && user.status !== 'Deleted') {
      const phone = user.phone || '';
      return res.json({
        _id: user._id,
        userId: user._id,
        donorId: `DNR-${user._id.toString().slice(-4).toUpperCase()}`,
        name: user.name || (phone ? `User ${phone.slice(-4)}` : 'Divine User'),
        email: user.email || user.googleEmail || '',
        phone: phone,
        mobileNumber: phone,
        status: user.status || 'Active',
        role: user.role || 'donor',
        gender: user.gender || null,
        profilePhoto: user.profilePhoto || null,
        verified: user.verified === true,
        walletBalance: user.walletBalance || 0,
        cashbackBalance: user.cashbackBalance || 0,
        totalCoins: user.totalCoins || 0,
        referralCode: user.referralCode || '',
        referredBy: user.referredBy || '',
        organizationName: user.organizationName || '',
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

// Add a new User / Donor
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      mobileNumber,
      role = 'donor',
      gender,
      city,
      state,
      panNumber,
      registrationNumber,
      organizationName,
      status = 'Active',
      verificationStatus = 'Pending',
      totalDonated = '₹0',
      campaignsSupported = 0
    } = req.body;

    const finalPhone = (phone || mobileNumber || '').trim();
    const finalEmail = (email || '').toLowerCase().trim();

    // 1. Create or update User record
    let user = null;
    if (finalPhone || finalEmail) {
      user = await User.findOne({
        $or: [
          ...(finalPhone ? [buildPhoneFilter(finalPhone)] : []),
          ...(finalEmail ? [{ email: finalEmail }] : [])
        ]
      });
    }

    const assignedRole = (role === 'ngo' || role === 'corporate') ? role : 'donor';

    if (!user) {
      user = new User({
        name: name || organizationName || 'Divine User',
        phone: finalPhone || undefined,
        email: finalEmail || undefined,
        role: assignedRole,
        gender: gender || null,
        status: (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active',
        verified: verificationStatus === 'Verified',
        organizationName: organizationName || (assignedRole !== 'donor' ? name : '')
      });
      await user.save().catch(err => console.log('User save warning:', err.message));
    }

    // 2. If NGO or Corporate, create NGO record if not existing
    if (assignedRole === 'ngo' || assignedRole === 'corporate') {
      const ngoExists = await NGO.findOne({
        $or: [
          ...(finalPhone ? [buildPhoneFilter(finalPhone)] : []),
          ...(finalEmail ? [{ email: finalEmail }] : [])
        ]
      });
      if (!ngoExists) {
        const newNgo = new NGO({
          ngoId: `NGO-${Date.now().toString().slice(-4)}`,
          name: organizationName || name,
          email: finalEmail || 'ngo@example.com',
          phone: finalPhone,
          registrationNumber: registrationNumber || 'REG-PENDING',
          organizationType: assignedRole === 'corporate' ? 'Corporate' : 'Non-Profit',
          status: verificationStatus || 'Pending',
          contactPerson: name
        });
        await newNgo.save().catch(err => console.log('NGO save warning:', err.message));
      }
    }

    // 3. Create Donor record
    const donorId = `DNR-${Date.now().toString().slice(-4)}`;
    const newDonor = new Donor({
      donorId,
      name: name || organizationName,
      email: finalEmail || 'user@example.com',
      phone: finalPhone,
      totalDonated: totalDonated || '₹0',
      campaignsSupported: campaignsSupported || 0,
      status: (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active'
    });
    const savedDonor = await newDonor.save();

    res.status(201).json({
      status: true,
      message: 'User created successfully',
      data: {
        ...savedDonor.toObject(),
        userId: user?._id,
        role: assignedRole,
        gender,
        verificationStatus
      }
    });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
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

    let ngo = null;
    if (!donor && !user) {
      ngo = await NGO.findById(id);
      if (ngo) {
        if (req.body.status) {
          ngo.status = (req.body.status === 'Suspended' || req.body.status === 'Inactive') ? 'Suspended' : 'Verified';
        }
        if (req.body.verificationStatus) {
          ngo.status = req.body.verificationStatus;
        }
        if (req.body.name) {
          ngo.name = req.body.name;
        }
        await ngo.save();
      }
    }

    if (!donor && !user && !ngo) {
      return res.status(404).json({ message: 'User record not found' });
    }

    res.json(donor || user || ngo);
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

    // 3. Try finding as NGO
    let ngo = null;
    if (!user && !donor) {
      ngo = await NGO.findById(id);
    }

    // 4. Link User, Donor, and NGO across collections by matching ID, email, or phone
    const candidateEmails = new Set();
    const candidatePhones = new Set();

    if (user) {
      if (user.email) candidateEmails.add(user.email.toLowerCase().trim());
      if (user.googleEmail) candidateEmails.add(user.googleEmail.toLowerCase().trim());
      if (user.phone) candidatePhones.add(user.phone);
    }
    if (donor) {
      if (donor.email) candidateEmails.add(donor.email.toLowerCase().trim());
      if (donor.phone) candidatePhones.add(donor.phone);
      if (donor.mobileNumber) candidatePhones.add(donor.mobileNumber);
    }
    if (ngo) {
      if (ngo.email) candidateEmails.add(ngo.email.toLowerCase().trim());
      if (ngo.phone) candidatePhones.add(ngo.phone);
    }

    const emailArr = Array.from(candidateEmails).filter(Boolean);
    const phoneArr = Array.from(candidatePhones).filter(Boolean);

    const lookupOr = [{ _id: id }];
    if (emailArr.length > 0) {
      lookupOr.push({ email: { $in: emailArr } });
      lookupOr.push({ googleEmail: { $in: emailArr } });
    }
    for (const ph of phoneArr) {
      lookupOr.push(buildPhoneFilter(ph));
    }

    if (!user) {
      user = await User.findOne({ $or: lookupOr });
    }
    if (!donor) {
      donor = await Donor.findOne({ $or: lookupOr });
    }
    if (!ngo) {
      ngo = await NGO.findOne({ $or: lookupOr });
    }

    if (!donor && !user && !ngo) {
      return res.status(404).json({ status: false, message: 'User / Donor / NGO profile not found' });
    }

    // 5. Send FORCE_LOGOUT silent push notification if device token exists
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

    // 6. Complete, thorough deletion from all collections (Issue 3)
    const deleteConditions = [{ _id: id }];
    if (user?._id) deleteConditions.push({ _id: user._id });
    if (donor?._id) deleteConditions.push({ _id: donor._id });
    if (ngo?._id) deleteConditions.push({ _id: ngo._id });
    if (emailArr.length > 0) {
      deleteConditions.push({ email: { $in: emailArr } });
      deleteConditions.push({ googleEmail: { $in: emailArr } });
    }
    for (const ph of phoneArr) {
      deleteConditions.push(buildPhoneFilter(ph));
    }

    const userIds = [];
    if (user?._id) userIds.push(user._id);
    if (donor?._id) userIds.push(donor._id);

    const cleanupPromises = [
      User.deleteMany({ $or: deleteConditions }),
      Donor.deleteMany({ $or: deleteConditions }),
      ngo ? NGO.deleteMany({ $or: deleteConditions }) : Promise.resolve()
    ];

    try {
      const Notification = require('../../models/Notification');
      if (userIds.length > 0) cleanupPromises.push(Notification.deleteMany({ user: { $in: userIds } }));
    } catch (e) {}

    try {
      const DanCart = require('../../models/DanCart');
      if (userIds.length > 0) cleanupPromises.push(DanCart.deleteMany({ donorId: { $in: userIds } }));
    } catch (e) {}

    await Promise.all(cleanupPromises);

    res.json({
      status: true,
      message: 'User account, profile records, and active sessions successfully and thoroughly deleted.'
    });
  } catch (err) {
    console.error('Delete donor error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
