const router = require('express').Router();
const SubjectCategory = require('../models/SubjectCategory');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await SubjectCategory.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a category
router.post('/', async (req, res) => {
  try {
    const categoryId = `CAT-${Date.now().toString().slice(-4)}`;
    const newCategory = new SubjectCategory({ ...req.body, categoryId });
    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const updatedCategory = await SubjectCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    await SubjectCategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
