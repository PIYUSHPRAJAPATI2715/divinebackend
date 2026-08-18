const router = require('express').Router();
const CampaignCategory = require('../../models/CampaignCategory');

// Default fallback icons map to prevent icons disappearing
const DEFAULT_CATEGORY_ICONS = {
  'Education': '📚',
  'Books': '📖',
  'Health': '🏥',
  'Food': '🍲',
  'Animal Welfare': '🐄',
  'Disaster Relief': '🚨',
  'Environment': '🌱',
  'Women Empowerment': '👩'
};

const DEFAULT_CATEGORY_IMAGES = {
  'Education': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
  'Books': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600',
  'Health': 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
  'Food': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600',
  'Animal Welfare': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&q=80&w=600'
};

// Get all categories with persistent icon fallback
router.get('/', async (req, res) => {
  try {
    const categories = await CampaignCategory.find().sort({ name: 1 });
    const normalized = categories.map(c => {
      const obj = c.toObject();
      if (!obj.icon || obj.icon.trim() === '') {
        obj.icon = DEFAULT_CATEGORY_ICONS[obj.name] || '🏷️';
      }
      if (!obj.imageUrl || obj.imageUrl.trim() === '') {
        obj.imageUrl = DEFAULT_CATEGORY_IMAGES[obj.name] || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600';
      }
      return obj;
    });
    res.json({ status: true, data: normalized });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Add a category
router.post('/', async (req, res) => {
  try {
    const { name, icon, imageUrl, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'Category name is required' });
    }
    if (!icon && !imageUrl) {
      return res.status(400).json({ status: false, message: 'Category Image or Icon is mandatory' });
    }

    const categoryId = `CAT-${Date.now().toString().slice(-4)}`;
    const newCategory = new CampaignCategory({
      categoryId,
      name,
      icon: icon || DEFAULT_CATEGORY_ICONS[name] || '🏷️',
      imageUrl: imageUrl || DEFAULT_CATEGORY_IMAGES[name] || '',
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
