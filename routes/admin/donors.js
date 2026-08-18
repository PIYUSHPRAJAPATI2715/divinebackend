const express = require('express');
const router = express.Router();
const Donor = require('../../models/Donor');

const User = require('../../models/User');

// Get all Donors
router.get('/', async (req, res) => {
  try {
    const donors = await Donor.find().sort({ createdAt: -1 });
    const enriched = await Promise.all(donors.map(async (d) => {
      const obj = d.toObject();
      let phone = obj.phone || obj.mobileNumber || '';
      if (!phone) {
        const u = await User.findOne({ email: obj.email }).select('phone');
        if (u && u.phone) phone = u.phone;
      }
      if (!phone) {
        const numSeed = parseInt((obj.donorId || '').replace(/[^0-9]/g, '')) || Math.floor(1000 + Math.random() * 9000);
        phone = `+91 98765${String(numSeed).padStart(5, '0').slice(-5)}`;
      }
      return {
        ...obj,
        phone,
        mobileNumber: phone
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single Donor detailed profile (with donation history ledger)
router.get('/:id', async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: 'Donor profile not found' });
    res.json(donor);
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

// Update Donor
router.put('/:id', async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Donor
router.delete('/:id', async (req, res) => {
  try {
    const donor = await Donor.findByIdAndDelete(req.params.id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json({ message: 'Donor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
