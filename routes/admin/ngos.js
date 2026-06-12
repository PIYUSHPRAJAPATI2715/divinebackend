const express = require('express');
const router = express.Router();
const NGO = require('../../models/NGO');

// Get all NGOs
router.get('/', async (req, res) => {
  try {
    const ngos = await NGO.find().sort({ createdAt: -1 });
    res.json(ngos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single NGO detailed profile
router.get('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findById(req.params.id);
    if (!ngo) return res.status(404).json({ message: 'NGO registration profile not found' });
    res.json(ngo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new NGO
router.post('/', async (req, res) => {
  try {
    const newNgo = new NGO({ ...req.body, ngoId: `NGO-${Date.now().toString().slice(-4)}` });
    const savedNgo = await newNgo.save();
    res.status(201).json(savedNgo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update NGO
router.put('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ngo) return res.status(404).json({ message: 'NGO not found' });
    res.json(ngo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete NGO
router.delete('/:id', async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndDelete(req.params.id);
    if (!ngo) return res.status(404).json({ message: 'NGO not found' });
    res.json({ message: 'NGO deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
