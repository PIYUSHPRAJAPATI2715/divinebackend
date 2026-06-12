const router = require('express').Router();
const CampaignCategory = require('../models/CampaignCategory');

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await CampaignCategory.find().sort({ name: 1 });
    res.json({ status: true, data: categories });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Add a category
router.post('/', async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'Category name is required' });
    }

    const categoryId = `CAT-${Date.now().toString().slice(-4)}`;
    const newCategory = new CampaignCategory({
      categoryId,
      name,
      icon: icon || '',
      description: description || ''
    });

    const savedCategory = await newCategory.save();
    res.status(201).json({ status: true, message: 'Category created successfully', data: savedCategory });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ status: false, message: 'Category name must be unique' });
    }
    res.status(400).json({ status: false, message: err.message });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const updatedCategory = await CampaignCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    res.json({ status: true, message: 'Category updated successfully', data: updatedCategory });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const deletedCategory = await CampaignCategory.findByIdAndDelete(req.params.id);
    if (!deletedCategory) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    res.json({ status: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
