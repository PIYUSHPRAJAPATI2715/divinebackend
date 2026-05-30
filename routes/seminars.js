const router = require('express').Router();
const Seminar = require('../models/Seminar');

// Get all seminars
router.get('/', async (req, res) => {
  try {
    const seminars = await Seminar.find();
    res.json(seminars);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single seminar details (workshop approval & scheduling status)
router.get('/:id', async (req, res) => {
  try {
    const seminar = await Seminar.findById(req.params.id);
    if (!seminar) return res.status(404).json({ message: 'Seminar not found' });
    res.json(seminar);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a seminar
router.post('/', async (req, res) => {
  try {
    const seminarId = `SEM-${Date.now().toString().slice(-4)}`;
    const newSeminar = new Seminar({ ...req.body, seminarId });
    const savedSeminar = await newSeminar.save();
    res.status(201).json(savedSeminar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update seminar (approvalStatus or paymentStatus)
router.put('/:id', async (req, res) => {
  try {
    const updatedSeminar = await Seminar.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedSeminar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete seminar
router.delete('/:id', async (req, res) => {
  try {
    await Seminar.findByIdAndDelete(req.params.id);
    res.json({ message: 'Seminar deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
