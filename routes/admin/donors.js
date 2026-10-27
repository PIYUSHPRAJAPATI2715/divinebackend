const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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

// Helper: Save Base64 file upload (PDF or Images)
const saveBase64Doc = (base64Str, req, defaultPrefix = 'doc') => {
  if (!base64Str || typeof base64Str !== 'string') return '';
  if (!base64Str.startsWith('data:') && !base64Str.includes(';base64,')) {
    return base64Str;
  }
  try {
    let ext = 'pdf';
    let rawData = base64Str;
    const matches = base64Str.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
      else if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      rawData = matches[2];
    }
    const buffer = Buffer.from(rawData, 'base64');
    if (buffer.slice(0, 4).toString() === '%PDF') ext = 'pdf';
    else if (buffer[0] === 0xFF && buffer[1] === 0xD8) ext = 'jpg';
    else if (buffer[0] === 0x89 && buffer[1] === 0x50) ext = 'png';

    const filename = `${defaultPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    const protocol = (req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https')) ? 'https' : 'http';
    const host = (req && req.get) ? req.get('host') : '195.35.20.150:8000';
    return `${protocol}://${host}/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving base64 document:', err);
    return base64Str;
  }
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
        logo: matchedNgo.logo || null,
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
        authorityLetterDoc: matchedNgo.formFillerDetails?.authorityLetterDoc || null,
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
      if (matchedDonorIds.has(d._id.toString())) continue;
      const dPhoneLast10 = cleanPhone(d.phone || d.mobileNumber);
      const dEmail = (d.email || '').toLowerCase().trim();
      
      // Do not add donor if phone was already processed from User record
      const alreadyHasUser = dPhoneLast10 && result.some(r => cleanPhone(r.phone || r.mobileNumber) === dPhoneLast10);
      if (alreadyHasUser) continue;

      const dObj = d.toObject();
      let phone = dObj.phone || dObj.mobileNumber || '';
      if (!phone) {
        const numSeed = parseInt((dObj.donorId || '').replace(/[^0-9]/g, '')) || Math.floor(1000 + Math.random() * 9000);
        phone = `+91 98765${String(numSeed).padStart(5, '0').slice(-5)}`;
      }
      matchedDonorIds.add(d._id.toString());
      result.push({
        ...dObj,
        phone,
        mobileNumber: phone,
        role: dObj.role || 'donor'
      });
    }

    // 3. Add remaining NGOs/Corporates from NGO collection that did not match a User record
    for (const n of ngos) {
      if (matchedNgoIds.has(n._id.toString())) continue;
      const nPhoneLast10 = cleanPhone(n.phone);
      const nEmail = (n.email || '').toLowerCase().trim();

      // Do not add NGO if phone already processed
      const alreadyHasUser = nPhoneLast10 && result.some(r => cleanPhone(r.phone || r.mobileNumber) === nPhoneLast10);
      if (alreadyHasUser) continue;

      matchedNgoIds.add(n._id.toString());
      const isCorp = n.organizationType === 'Corporate' || n.organizationType === 'Company';
      const role = isCorp ? 'corporate' : 'ngo';
      result.push({
        _id: n._id,
        userId: n._id,
        donorId: `${isCorp ? 'CRP' : 'NGO'}-${n._id.toString().slice(-4).toUpperCase()}`,
        name: n.name || (isCorp ? 'Corporate Partner' : 'NGO Organization'),
        email: nEmail,
        phone: n.phone || '',
        mobileNumber: n.phone || '',
        status: (n.status === 'Suspended' || n.status === 'Inactive') ? 'Inactive' : 'Active',
        role: role,
        organizationType: isCorp ? 'Corporate' : 'Non-Profit',
        organizationName: n.name,
        legalName: n.legalName || n.name || '',
        contactPerson: n.contactPerson || '',
        designation: n.designation || '',
        websiteUrl: n.websiteUrl || '',
        about: n.about || '',
        logo: n.logo || null,
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
        authorityLetterDoc: n.formFillerDetails?.authorityLetterDoc || null,
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

    // Deduplicate result array: ensure each unique 10-digit mobile number appears strictly ONCE
    const seenPhones = new Set();
    const seenEmails = new Set();
    const finalResult = [];

    // Prioritize entries that have actual User records (userId that exists in users)
    const userIdsSet = new Set(users.map(u => u._id.toString()));
    result.sort((a, b) => {
      const aHasUser = a.userId && userIdsSet.has(a.userId.toString()) ? 1 : 0;
      const bHasUser = b.userId && userIdsSet.has(b.userId.toString()) ? 1 : 0;
      if (bHasUser !== aHasUser) return bHasUser - aHasUser;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    for (const item of result) {
      const phoneDigits = cleanPhone(item.phone || item.mobileNumber);
      const emailLower = (item.email || '').toLowerCase().trim();

      if (phoneDigits && phoneDigits.length >= 10) {
        if (seenPhones.has(phoneDigits)) continue;
        seenPhones.add(phoneDigits);
      }
      if (emailLower && emailLower !== 'user@example.com' && emailLower !== 'ngo@example.com') {
        if (seenEmails.has(emailLower)) continue;
        seenEmails.add(emailLower);
      }
      finalResult.push(item);
    }

    // Sort combined deduplicated list newest first
    finalResult.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(finalResult);
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
      campaignsSupported = 0,
      legalName,
      contactPerson,
      designation,
      registeredAddress,
      websiteUrl,
      about,
      tanNumber,
      gstNumber,
      has12A,
      registration12A,
      has80G,
      registration80G,
      hasDarpan,
      darpanNumber,
      hasCSR1,
      csr1Number,
      hasFCRA,
      fcraNumber,
      bankAccountHolder,
      bankName,
      bankBranch,
      bankAccountNumber,
      bankIFSC
    } = req.body;

    const finalPhone = (phone || mobileNumber || '').trim();
    const finalEmail = (email || '').toLowerCase().trim();
    const assignedRole = (role === 'ngo' || role === 'corporate') ? role : 'donor';
    const isCorp = assignedRole === 'corporate';
    const isVerified = verificationStatus === 'Verified';

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

    if (user) {
      user.name = name || organizationName || user.name || 'Divine User';
      if (finalPhone) user.phone = finalPhone;
      if (finalEmail) user.email = finalEmail;
      user.role = assignedRole;
      if (gender) user.gender = gender;
      user.status = (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active';
      user.verified = isVerified;
      user.verificationStatus = verificationStatus || 'Pending';
      user.organizationName = organizationName || (assignedRole !== 'donor' ? name : user.organizationName);
      user.isProfileComplete = true;
      await user.save();
    } else {
      user = new User({
        name: name || organizationName || 'Divine User',
        phone: finalPhone || undefined,
        email: finalEmail || undefined,
        role: assignedRole,
        gender: gender || null,
        status: (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active',
        verified: isVerified,
        verificationStatus: verificationStatus || 'Pending',
        organizationName: organizationName || (assignedRole !== 'donor' ? name : ''),
        isProfileComplete: true
      });
      await user.save().catch(err => console.log('User save warning:', err.message));
    }

    // 2. If NGO or Corporate, create or update NGO record with all profile fields (Point 5 / Point 11)
    let ngo = null;
    if (assignedRole === 'ngo' || assignedRole === 'corporate') {
      if (finalPhone || finalEmail) {
        ngo = await NGO.findOne({
          $or: [
            ...(finalPhone ? [buildPhoneFilter(finalPhone)] : []),
            ...(finalEmail ? [{ email: finalEmail }] : [])
          ]
        });
      }

      // Save all Base64 documents to /uploads/ with appropriate extensions
      const savedLogo = req.body.logo ? saveBase64Doc(req.body.logo, req, 'logo') : null;
      const savedAddressCert = req.body.addressCertificate ? saveBase64Doc(req.body.addressCertificate, req, 'address_cert') : null;
      const savedPanImage = req.body.panImage ? saveBase64Doc(req.body.panImage, req, 'pan') : null;
      const savedTanImage = req.body.tanImage ? saveBase64Doc(req.body.tanImage, req, 'tan') : null;
      const savedGstDoc = req.body.gstDocument ? saveBase64Doc(req.body.gstDocument, req, 'gst') : null;
      const savedCert12A = req.body.certificate12A ? saveBase64Doc(req.body.certificate12A, req, '12a') : null;
      const savedCert80G = req.body.certificate80G ? saveBase64Doc(req.body.certificate80G, req, '80g') : null;
      const savedDarpan = req.body.darpanCertificate ? saveBase64Doc(req.body.darpanCertificate, req, 'darpan') : null;
      const savedCsr1 = req.body.csr1Certificate ? saveBase64Doc(req.body.csr1Certificate, req, 'csr1') : null;
      const savedFcra = req.body.fcraCertificate ? saveBase64Doc(req.body.fcraCertificate, req, 'fcra') : null;
      const savedCheque = req.body.cancelledChequeDoc ? saveBase64Doc(req.body.cancelledChequeDoc, req, 'cheque') : null;
      const savedAuthorityLetter = req.body.authorityLetterDoc ? saveBase64Doc(req.body.authorityLetterDoc, req, 'authority_letter') : null;

      let savedMoaAoaDocs = [];
      if (Array.isArray(req.body.moaAoaDocs)) {
        savedMoaAoaDocs = req.body.moaAoaDocs.map((doc, idx) => saveBase64Doc(doc, req, `moa_${idx + 1}`)).filter(Boolean);
      } else if (req.body.moaAoaDocs) {
        savedMoaAoaDocs = [saveBase64Doc(req.body.moaAoaDocs, req, 'moa_1')].filter(Boolean);
      }

      const ngoData = {
        name: organizationName || name || 'Organization Partner',
        legalName: legalName || organizationName || name || '',
        logo: savedLogo || null,
        email: finalEmail || 'ngo@example.com',
        phone: finalPhone || '',
        registrationNumber: registrationNumber || 'REG-PENDING',
        organizationType: isCorp ? 'Corporate' : 'Non-Profit',
        status: verificationStatus || 'Pending',
        contactPerson: contactPerson || name || '',
        designation: designation || '',
        registeredAddress: registeredAddress || req.body.address || '',
        addressCertificate: savedAddressCert,
        websiteUrl: websiteUrl || '',
        about: about || '',
        panNumber: panNumber || '',
        panImage: savedPanImage,
        tanNumber: tanNumber || '',
        tanImage: savedTanImage,
        gstNumber: gstNumber || '',
        gstDocument: savedGstDoc,
        has12A: has12A || (savedCert12A || registration12A ? 'Yes' : 'No'),
        registration12A: registration12A || '',
        certificate12A: savedCert12A,
        has80G: has80G || (savedCert80G || registration80G ? 'Yes' : 'No'),
        registration80G: registration80G || '',
        certificate80G: savedCert80G,
        hasDarpan: hasDarpan || (savedDarpan || darpanNumber ? 'Yes' : 'No'),
        darpanNumber: darpanNumber || '',
        darpanCertificate: savedDarpan,
        hasCSR1: hasCSR1 || (savedCsr1 || csr1Number ? 'Yes' : 'No'),
        csr1Number: csr1Number || '',
        csr1Certificate: savedCsr1,
        hasFCRA: hasFCRA || (savedFcra || fcraNumber ? 'Yes' : 'No'),
        fcraNumber: fcraNumber || '',
        fcraCertificate: savedFcra,
        moaAoaDocs: savedMoaAoaDocs,
        bankAccountHolder: bankAccountHolder || '',
        bankName: bankName || '',
        bankBranch: bankBranch || '',
        bankAccountNumber: bankAccountNumber || '',
        bankIFSC: bankIFSC || '',
        cancelledChequeDoc: savedCheque,
        formFillerDetails: {
          name: contactPerson || name || '',
          designationRole: designation || '',
          phone: finalPhone || '',
          email: finalEmail || '',
          authorityLetterDoc: savedAuthorityLetter
        }
      };

      if (savedLogo && user) {
        user.profilePhoto = savedLogo;
        await user.save();
      }

      if (ngo) {
        Object.assign(ngo, ngoData);
        await ngo.save();
      } else {
        ngo = new NGO({
          ngoId: `${isCorp ? 'CRP' : 'NGO'}-${Date.now().toString().slice(-4)}`,
          ...ngoData
        });
        await ngo.save().catch(err => console.log('NGO save warning:', err.message));
      }
    }

    // 3. Create or update Donor record
    let donor = null;
    if (finalPhone || finalEmail) {
      donor = await Donor.findOne({
        $or: [
          ...(finalPhone ? [buildPhoneFilter(finalPhone)] : []),
          ...(finalEmail ? [{ email: finalEmail }] : [])
        ]
      });
    }

    if (donor) {
      donor.name = name || organizationName || donor.name;
      if (finalEmail) donor.email = finalEmail;
      if (finalPhone) donor.phone = finalPhone;
      donor.status = (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active';
      await donor.save();
    } else {
      const donorId = `DNR-${Date.now().toString().slice(-4)}`;
      donor = new Donor({
        donorId,
        name: name || organizationName || 'Divine User',
        email: finalEmail || 'user@example.com',
        phone: finalPhone,
        totalDonated: totalDonated || '₹0',
        campaignsSupported: campaignsSupported || 0,
        status: (status === 'Inactive' || status === 'Suspended') ? 'Suspended' : 'Active'
      });
      await donor.save();
    }

    res.status(201).json({
      status: true,
      message: 'User created successfully',
      data: {
        ...(donor ? donor.toObject() : {}),
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

// Update Donor & sync to User & NGO
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let donor = await Donor.findById(id);
    let user = await User.findById(id);
    let ngo = await NGO.findById(id);

    // If id was a Donor id, find user and ngo
    if (donor && !user) {
      const dPhone = donor.phone || donor.mobileNumber || '';
      const dEmail = (donor.email || '').toLowerCase().trim();
      user = await User.findOne({
        $or: [
          ...(dPhone ? [buildPhoneFilter(dPhone)] : []),
          ...(dEmail ? [{ email: dEmail }, { googleEmail: dEmail }] : [])
        ]
      });
      if (!ngo && (dPhone || dEmail)) {
        ngo = await NGO.findOne({
          $or: [
            ...(dPhone ? [buildPhoneFilter(dPhone)] : []),
            ...(dEmail ? [{ email: dEmail }] : [])
          ]
        });
      }
    }

    // If id was a User id, find matching donor and ngo
    if (user) {
      const uPhone = user.phone || '';
      const uEmail = (user.email || user.googleEmail || '').toLowerCase().trim();
      if (!donor && (uPhone || uEmail)) {
        donor = await Donor.findOne({
          $or: [
            ...(uPhone ? [buildPhoneFilter(uPhone)] : []),
            ...(uEmail ? [{ email: uEmail }] : [])
          ]
        });
      }
      if (!ngo && (uPhone || uEmail || user.organizationName)) {
        ngo = await NGO.findOne({
          $or: [
            ...(uPhone ? [buildPhoneFilter(uPhone)] : []),
            ...(uEmail ? [{ email: uEmail }] : []),
            ...(user.organizationName ? [{ name: user.organizationName }] : [])
          ]
        });
      }
    }

    // If id was an NGO id, find matching user and donor
    if (ngo) {
      const nPhone = ngo.phone || '';
      const nEmail = (ngo.email || '').toLowerCase().trim();
      if (!user && (nPhone || nEmail)) {
        user = await User.findOne({
          $or: [
            ...(nPhone ? [buildPhoneFilter(nPhone)] : []),
            ...(nEmail ? [{ email: nEmail }, { googleEmail: nEmail }] : [])
          ]
        });
      }
      if (!donor && (nPhone || nEmail)) {
        donor = await Donor.findOne({
          $or: [
            ...(nPhone ? [buildPhoneFilter(nPhone)] : []),
            ...(nEmail ? [{ email: nEmail }] : [])
          ]
        });
      }
    }

    const targetRole = req.body.role || user?.role || donor?.role || (ngo?.organizationType === 'Corporate' ? 'corporate' : (ngo ? 'ngo' : 'donor'));
    const isVerifying = req.body.verificationStatus === 'Verified' || req.body.verified === true;
    const isRejecting = req.body.verificationStatus === 'Rejected' || req.body.status === 'Rejected';
    const isSuspending = req.body.status === 'Suspended' || req.body.status === 'Inactive';

    // 1. Sync User
    if (user) {
      if (req.body.role) user.role = req.body.role;
      if (req.body.name) user.name = req.body.name;
      if (req.body.organizationName) user.organizationName = req.body.organizationName;
      if (req.body.email) user.email = req.body.email.toLowerCase().trim();
      if (req.body.phone) user.phone = req.body.phone.trim();

      if (isVerifying) {
        user.verified = true;
        user.verificationStatus = 'Verified';
        user.status = 'Active';
        user.isProfileComplete = true;
        user.rejectionReason = '';
      } else if (isRejecting) {
        user.verified = false;
        user.verificationStatus = 'Rejected';
        user.status = 'Rejected';
        user.rejectionReason = req.body.rejectionReason || '';
      } else if (req.body.verificationStatus) {
        user.verificationStatus = req.body.verificationStatus;
      }

      if (req.body.status) {
        user.status = isSuspending ? 'Suspended' : (isRejecting ? 'Rejected' : 'Active');
        if (isSuspending) {
          user.fcmToken = null;
          user.deviceToken = null;
        }
      }

      if (targetRole === 'ngo' || targetRole === 'corporate') {
        user.isProfileComplete = true;
      }

      await user.save();
    } else if (targetRole === 'ngo' || targetRole === 'corporate' || isVerifying) {
      // Auto-provision user if missing so they can log in seamlessly
      const finalPhone = req.body.phone || donor?.phone || donor?.mobileNumber || ngo?.phone;
      const finalEmail = req.body.email || donor?.email || ngo?.email;
      const finalName = req.body.organizationName || req.body.name || donor?.name || ngo?.name || 'Divine User';
      if (finalPhone || finalEmail) {
        user = new User({
          name: finalName,
          phone: finalPhone,
          email: finalEmail,
          role: targetRole,
          status: isSuspending ? 'Suspended' : (isRejecting ? 'Rejected' : 'Active'),
          verified: isVerifying,
          verificationStatus: isVerifying ? 'Verified' : (isRejecting ? 'Rejected' : 'Pending'),
          organizationName: req.body.organizationName || finalName,
          isProfileComplete: true
        });
        await user.save().catch(e => console.warn('User auto-provision in put warning:', e.message));
      }
    }

    // 2. Sync NGO (for NGO / Corporate roles)
    if (targetRole === 'ngo' || targetRole === 'corporate') {
      const isCorp = targetRole === 'corporate' || req.body.organizationType === 'Corporate';
      const ngoFields = {
        name: req.body.organizationName || req.body.name || user?.name || donor?.name,
        legalName: req.body.legalName || req.body.organizationName || req.body.name || user?.name,
        phone: req.body.phone || user?.phone || donor?.phone || donor?.mobileNumber,
        email: req.body.email || user?.email || donor?.email,
        organizationType: isCorp ? 'Corporate' : 'Non-Profit',
        status: isVerifying ? 'Verified' : (isRejecting ? 'Rejected' : (req.body.verificationStatus || 'Pending')),
        rejectionReason: isRejecting ? (req.body.rejectionReason || '') : '',
        registrationNumber: req.body.registrationNumber,
        contactPerson: req.body.contactPerson,
        designation: req.body.designation,
        registeredAddress: req.body.registeredAddress || req.body.address,
        websiteUrl: req.body.websiteUrl,
        about: req.body.about,
        panNumber: req.body.panNumber,
        tanNumber: req.body.tanNumber,
        gstNumber: req.body.gstNumber,
        has12A: req.body.has12A,
        registration12A: req.body.registration12A,
        has80G: req.body.has80G,
        registration80G: req.body.registration80G,
        hasDarpan: req.body.hasDarpan,
        darpanNumber: req.body.darpanNumber,
        hasCSR1: req.body.hasCSR1,
        csr1Number: req.body.csr1Number,
        hasFCRA: req.body.hasFCRA,
        fcraNumber: req.body.fcraNumber,
        bankAccountHolder: req.body.bankAccountHolder,
        bankName: req.body.bankName,
        bankBranch: req.body.bankBranch,
        bankAccountNumber: req.body.bankAccountNumber,
        bankIFSC: req.body.bankIFSC
      };

      // Process and save Base64 documents if provided
      if (req.body.logo !== undefined) {
        ngoFields.logo = req.body.logo ? saveBase64Doc(req.body.logo, req, 'logo') : null;
        if (user && ngoFields.logo) {
          user.profilePhoto = ngoFields.logo;
          await user.save();
        }
      }
      if (req.body.addressCertificate !== undefined) {
        ngoFields.addressCertificate = req.body.addressCertificate ? saveBase64Doc(req.body.addressCertificate, req, 'address_cert') : null;
      }
      if (req.body.panImage !== undefined) {
        ngoFields.panImage = req.body.panImage ? saveBase64Doc(req.body.panImage, req, 'pan') : null;
      }
      if (req.body.tanImage !== undefined) {
        ngoFields.tanImage = req.body.tanImage ? saveBase64Doc(req.body.tanImage, req, 'tan') : null;
      }
      if (req.body.gstDocument !== undefined) {
        ngoFields.gstDocument = req.body.gstDocument ? saveBase64Doc(req.body.gstDocument, req, 'gst') : null;
      }
      if (req.body.certificate12A !== undefined) {
        ngoFields.certificate12A = req.body.certificate12A ? saveBase64Doc(req.body.certificate12A, req, '12a') : null;
      }
      if (req.body.certificate80G !== undefined) {
        ngoFields.certificate80G = req.body.certificate80G ? saveBase64Doc(req.body.certificate80G, req, '80g') : null;
      }
      if (req.body.darpanCertificate !== undefined) {
        ngoFields.darpanCertificate = req.body.darpanCertificate ? saveBase64Doc(req.body.darpanCertificate, req, 'darpan') : null;
      }
      if (req.body.csr1Certificate !== undefined) {
        ngoFields.csr1Certificate = req.body.csr1Certificate ? saveBase64Doc(req.body.csr1Certificate, req, 'csr1') : null;
      }
      if (req.body.fcraCertificate !== undefined) {
        ngoFields.fcraCertificate = req.body.fcraCertificate ? saveBase64Doc(req.body.fcraCertificate, req, 'fcra') : null;
      }
      if (req.body.cancelledChequeDoc !== undefined) {
        ngoFields.cancelledChequeDoc = req.body.cancelledChequeDoc ? saveBase64Doc(req.body.cancelledChequeDoc, req, 'cheque') : null;
      }
      if (req.body.moaAoaDocs !== undefined) {
        if (Array.isArray(req.body.moaAoaDocs)) {
          ngoFields.moaAoaDocs = req.body.moaAoaDocs.map((doc, idx) => saveBase64Doc(doc, req, `moa_${idx + 1}`)).filter(Boolean);
        } else if (req.body.moaAoaDocs) {
          ngoFields.moaAoaDocs = [saveBase64Doc(req.body.moaAoaDocs, req, 'moa_1')].filter(Boolean);
        }
      }
      if (req.body.authorityLetterDoc !== undefined) {
        const savedAuthLetter = req.body.authorityLetterDoc ? saveBase64Doc(req.body.authorityLetterDoc, req, 'authority_letter') : null;
        ngoFields.formFillerDetails = {
          ...(ngo?.formFillerDetails || {}),
          authorityLetterDoc: savedAuthLetter
        };
      }

      Object.keys(ngoFields).forEach(k => ngoFields[k] === undefined && delete ngoFields[k]);

      if (ngo) {
        Object.assign(ngo, ngoFields);
        await ngo.save();
      } else if (ngoFields.phone || ngoFields.email) {
        const newNgo = new NGO({
          ngoId: `${isCorp ? 'CRP' : 'NGO'}-${Date.now().toString().slice(-4)}`,
          ...ngoFields
        });
        await newNgo.save().catch(e => console.warn('NGO auto-create warning:', e.message));
        ngo = newNgo;
      }
    }

    // 3. Sync Donor
    if (donor) {
      if (req.body.name) donor.name = req.body.name;
      if (req.body.email) donor.email = req.body.email;
      if (req.body.phone) donor.phone = req.body.phone;
      if (req.body.status) donor.status = isSuspending ? 'Suspended' : 'Active';
      await donor.save();
    }

    // Trigger push notification if status changed to Verified or Rejected
    if (user && (isVerifying || isRejecting)) {
      try {
        const { createAndSendNotification } = require('../../utils/notification');
        await createAndSendNotification({
          userId: user._id,
          title: isVerifying ? 'Account Verified ✅' : 'Account Verification Update ⚠️',
          body: isVerifying 
            ? 'Congratulations! Your account has been verified by the administrator.' 
            : `Your verification request was rejected: ${req.body.rejectionReason || 'Please review your details.'}`,
          type: 'verification',
          screen: 'profile'
        });
      } catch (notifErr) {}
    }

    if (!donor && !user && !ngo) {
      return res.status(404).json({ message: 'User record not found' });
    }

    res.json(user || donor || ngo);
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
