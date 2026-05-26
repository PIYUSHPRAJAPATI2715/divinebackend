const router = require('express').Router();
const Referral = require('../models/Referral');

// Get all referrals
router.get('/', async (req, res) => {
  try {
    const referrals = await Referral.find();
    res.json(referrals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a referral
router.post('/', async (req, res) => {
  try {
    const referralId = `REF-${Date.now().toString().slice(-4)}`;
    const newReferral = new Referral({ ...req.body, referralId });
    const savedReferral = await newReferral.save();
    res.status(201).json(savedReferral);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update referral
router.put('/:id', async (req, res) => {
  try {
    const updatedReferral = await Referral.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedReferral);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete referral
router.delete('/:id', async (req, res) => {
  try {
    await Referral.findByIdAndDelete(req.params.id);
    res.json({ message: 'Referral deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
