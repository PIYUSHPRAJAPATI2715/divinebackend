const express = require('express');
const router = express.Router();
const Donor = require('../../models/Donor');

// Get all Donors
router.get('/', async (req, res) => {
  try {
    const donors = await Donor.find().sort({ createdAt: -1 });
    res.json(donors);
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
