const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const DanCategory = require('../models/DanCategory');
const DanSubcategory = require('../models/DanSubcategory');
const DanItem = require('../models/DanItem');
const DanDonation = require('../models/DanDonation');
const NGO = require('../models/NGO');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const DanCart = require('../models/DanCart');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'divine_nakshatra_secret_key_2026';

// Helper middleware to extract user context optionally
const extractUser = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id || decoded._id;
      if (decoded.role === 'admin') {
        const dbAdmin = await Admin.findById(userId);
        if (dbAdmin) {
          req.user = {
            ...decoded,
            id: userId,
            _id: userId,
            role: 'admin',
            name: 'Admin',
            email: dbAdmin.email
          };
        }
      } else {
        const dbUser = await User.findById(userId);
        if (dbUser) {
          req.user = {
            ...decoded,
            id: userId,
            _id: userId,
            role: dbUser.role,
            name: dbUser.name || dbUser.organizationName || 'User',
            phone: dbUser.phone,
            email: dbUser.email
          };
        }
      }
    } catch (err) {
      console.log('Extract user token failed:', err.message);
    }
  }
  next();
};

// Required authentication check for management actions
const requireNGOOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, message: 'Access denied. Authentication token required.' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'ngo') {
    return res.status(403).json({ status: false, message: 'Access denied: NGO or Admin role required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, message: 'Access denied. Authentication token required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ status: false, message: 'Access denied: Admin role required' });
  }
  next();
};

// Helper function to check resource ownership for edit/delete operations
const checkOwnership = async (req, resource) => {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'ngo') {
    const ngo = await NGO.findOne({ $or: [{ phone: req.user.phone }, { email: req.user.email }] });
    if (ngo && resource.ngoId && resource.ngoId.toString() === ngo._id.toString()) {
      return true;
    }
  }
  return false;
};

// Apply extractUser middleware to all routes
router.use(extractUser);

// ----------------------------------------------------
// 1. Categories APIs
// ----------------------------------------------------

// List active categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await DanCategory.find({ status: 'Active' }).populate('ngoId', 'name logo');
    const Banner = require('../models/Banner');
    const topBanners = await Banner.find({ placement: 'DaanTop', status: 'Active' });
    const bottomBanners = await Banner.find({ placement: 'DaanBottom', status: 'Active' });
    
    res.json({ 
      status: true, 
      banners: {
        top: topBanners,
        bottom: bottomBanners
      },
      data: categories 
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create category
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, icon, imageUrl, description } = req.body;
    if (!name) {
      return res.status(400).json({ status: false, message: 'Name is required' });
    }

    let ngoId = null;
    let creatorType = 'Admin';
    if (req.user.role === 'ngo') {
      creatorType = 'NGO';
      const ngo = await NGO.findOne({ $or: [{ phone: req.user.phone }, { email: req.user.email }] });
      if (!ngo) {
        return res.status(404).json({ status: false, message: 'NGO profile not found' });
      }
      ngoId = ngo._id;
    }

    const categoryId = `CAT-DAN-${Date.now().toString().slice(-4)}`;
    const newCategory = new DanCategory({
      categoryId,
      name,
      icon,
      imageUrl,
      description,
      creatorType,
      ngoId
    });
    await newCategory.save();
    res.status(201).json({ status: true, message: 'Dan Category created successfully', data: newCategory });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Edit category
router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const category = await DanCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    const isOwner = await checkOwnership(req, category);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this category' });
    }

    const updated = await DanCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: true, message: 'Category updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Delete category
router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const category = await DanCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    const isOwner = await checkOwnership(req, category);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this category' });
    }

    await DanCategory.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. Subcategories APIs
// ----------------------------------------------------

// List subcategories
router.get('/subcategories', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = { status: 'Active' };
    if (category) {
      filter.categoryId = category;
    }
    const subcategories = await DanSubcategory.find(filter)
      .populate('categoryId', 'name')
      .populate('ngoId', 'name logo');
    res.json({ status: true, data: subcategories });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create subcategory (Admin only)
router.post('/subcategories', requireAdmin, async (req, res) => {
  try {
    const { categoryId, name, imageUrl, description } = req.body;
    if (!categoryId || !name) {
      return res.status(400).json({ status: false, message: 'CategoryId and Name are required' });
    }

    const category = await DanCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Parent Dan Category not found' });
    }

    let ngoId = null;
    let creatorType = 'Admin';
    if (req.user.role === 'ngo') {
      creatorType = 'NGO';
      const ngo = await NGO.findOne({ $or: [{ phone: req.user.phone }, { email: req.user.email }] });
      if (!ngo) {
        return res.status(404).json({ status: false, message: 'NGO profile not found' });
      }
      ngoId = ngo._id;
    }

    const subcategoryId = `SUB-DAN-${Date.now().toString().slice(-4)}`;
    const newSubcategory = new DanSubcategory({
      subcategoryId,
      categoryId,
      name,
      imageUrl,
      description,
      creatorType,
      ngoId
    });
    await newSubcategory.save();
    res.status(201).json({ status: true, message: 'Dan Subcategory created successfully', data: newSubcategory });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Edit subcategory
router.put('/subcategories/:id', requireAdmin, async (req, res) => {
  try {
    const subcategory = await DanSubcategory.findById(req.params.id);
    if (!subcategory) {
      return res.status(404).json({ status: false, message: 'Subcategory not found' });
    }
    const isOwner = await checkOwnership(req, subcategory);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this subcategory' });
    }

    const updated = await DanSubcategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: true, message: 'Subcategory updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Delete subcategory
router.delete('/subcategories/:id', requireAdmin, async (req, res) => {
  try {
    const subcategory = await DanSubcategory.findById(req.params.id);
    if (!subcategory) {
      return res.status(404).json({ status: false, message: 'Subcategory not found' });
    }
    const isOwner = await checkOwnership(req, subcategory);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this subcategory' });
    }

    await DanSubcategory.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Subcategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. Items APIs
// ----------------------------------------------------

// List items
router.get('/items', async (req, res) => {
  try {
    const { subcategory } = req.query;
    let filter = { status: 'Active' };
    if (subcategory) {
      filter.subcategoryId = subcategory;
    }
    const items = await DanItem.find(filter)
      .populate({
        path: 'subcategoryId',
        select: 'name categoryId',
        populate: { path: 'categoryId', select: 'name' }
      })
      .populate('ngoId', 'name logo');
    res.json({ status: true, data: items });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create item (Admin only)
router.post('/items', requireAdmin, async (req, res) => {
  try {
    const { subcategoryId, name, description, price, unit, imageUrl } = req.body;
    if (!subcategoryId || !name || price === undefined) {
      return res.status(400).json({ status: false, message: 'subcategoryId, name, and price are required' });
    }

    const subcategory = await DanSubcategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ status: false, message: 'Parent Dan Subcategory not found' });
    }

    let ngoId = null;
    let creatorType = 'Admin';
    if (req.user.role === 'ngo') {
      creatorType = 'NGO';
      const ngo = await NGO.findOne({ $or: [{ phone: req.user.phone }, { email: req.user.email }] });
      if (!ngo) {
        return res.status(404).json({ status: false, message: 'NGO profile not found' });
      }
      ngoId = ngo._id;
    }

    const itemId = `ITM-DAN-${Date.now().toString().slice(-4)}`;
    const newItem = new DanItem({
      itemId,
      subcategoryId,
      name,
      description,
      price: Number(price),
      unit: unit || 'Unit',
      imageUrl,
      creatorType,
      ngoId
    });
    await newItem.save();
    res.status(201).json({ status: true, message: 'Dan Item created successfully', data: newItem });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Edit item
router.put('/items/:id', requireNGOOrAdmin, async (req, res) => {
  try {
    const item = await DanItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }
    const isOwner = await checkOwnership(req, item);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this item' });
    }

    const updated = await DanItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ status: true, message: 'Item updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Delete item
router.delete('/items/:id', requireNGOOrAdmin, async (req, res) => {
  try {
    const item = await DanItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ status: false, message: 'Item not found' });
    }
    const isOwner = await checkOwnership(req, item);
    if (!isOwner) {
      return res.status(403).json({ status: false, message: 'Access denied: You do not own this item' });
    }

    await DanItem.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ----------------------------------------------------
// 4. Donation & Checkout APIs
// ----------------------------------------------------

// Checkout / Donate
router.post('/donate', async (req, res) => {
  try {
    const { 
      donorName, 
      donorPhone, 
      donorEmail, 
      items, 
      frequency, 
      eventType, 
      eventName, 
      eventDate, 
      paymentMethod 
    } = req.body;

    if (frequency && !['One-Time', 'Monthly'].includes(frequency)) {
      return res.status(400).json({ status: false, message: 'Invalid frequency. Must be One-Time or Monthly.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: false, message: 'Items list is required and cannot be empty' });
    }

    let totalAmount = 0;
    const resolvedItems = [];
    let primaryNgoId = null;

    // Resolve items details
    for (const itemInput of items) {
      const { itemId, quantity } = itemInput;
      if (!itemId || !quantity || Number(quantity) <= 0) {
        return res.status(400).json({ status: false, message: 'Valid itemId and quantity are required for each item' });
      }

      const dbItem = await DanItem.findById(itemId);
      if (!dbItem) {
        return res.status(404).json({ status: false, message: `Dan Item not found: ${itemId}` });
      }

      if (dbItem.ngoId) {
        primaryNgoId = dbItem.ngoId;
      }

      const subtotal = dbItem.price * Number(quantity);
      totalAmount += subtotal;

      resolvedItems.push({
        itemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: Number(quantity),
        subtotal
      });
    }

    let donorId = null;
    let finalDonorName = donorName || 'Anonymous Donor';
    let finalDonorPhone = donorPhone || '';
    let finalDonorEmail = donorEmail || '';

    // If authenticated user is performing the checkout
    if (req.user && req.user._id) {
      donorId = req.user._id;
      const user = await User.findById(req.user._id);
      if (user) {
        if (!donorName) finalDonorName = user.name || user.phone;
        if (!donorPhone) finalDonorPhone = user.phone;
        if (!donorEmail) finalDonorEmail = user.email;

        // Deduct from wallet if requested
        if (paymentMethod === 'Wallet') {
          if ((user.walletBalance || 0) < totalAmount) {
            return res.status(400).json({ status: false, message: 'Insufficient wallet balance. Please top up.' });
          }
          user.walletBalance -= totalAmount;
          await user.save();
        }
      }
    }

    const donationId = `DON-${Date.now().toString().slice(-4)}`;
    const transactionId = `TXN-${Date.now().toString().slice(-4)}`;

    // Derive fund category from first item's subcategory chain
    let fundCategory = 'Daan';
    if (resolvedItems.length > 0) {
      const firstItem = await DanItem.findById(resolvedItems[0].itemId).populate({
        path: 'subcategoryId',
        populate: { path: 'categoryId', select: 'name' }
      });
      if (firstItem?.subcategoryId?.categoryId?.name) {
        fundCategory = firstItem.subcategoryId.categoryId.name;
      }
    }

    // Create Transaction Ledger Entry
    const itemDesc = resolvedItems.map(item => `${item.name} (x${item.quantity})`).join(', ');
    const newTx = new Transaction({
      transactionId,
      type: 'Donation',
      user: finalDonorName,
      mobile: finalDonorPhone || '',
      fundCategory,
      amount: totalAmount,
      status: 'Success',
      date: new Date(),
      item: `Dan: ${itemDesc.slice(0, 100)}`
    });
    await newTx.save();

    // Create Dan Donation Entry
    const danDonation = new DanDonation({
      donationId,
      donorId,
      donorName: finalDonorName,
      donorPhone: finalDonorPhone,
      donorEmail: finalDonorEmail,
      items: resolvedItems,
      totalAmount,
      frequency: frequency || 'One-Time',
      eventType: eventType || 'Others',
      eventName: eventName || '',
      eventDate: eventDate ? new Date(eventDate) : null,
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: 'Success',
      ngoId: primaryNgoId,
      transactionId
    });
    await danDonation.save();

    res.json({
      status: true,
      message: 'Donation completed successfully!',
      data: danDonation
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// List all donations
router.get('/donations', requireNGOOrAdmin, async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'ngo') {
      const ngo = await NGO.findOne({ $or: [{ phone: req.user.phone }, { email: req.user.email }] });
      if (!ngo) {
        return res.status(404).json({ status: false, message: 'NGO profile not found' });
      }
      filter.ngoId = ngo._id;
    }
    const donations = await DanDonation.find(filter)
      .populate('ngoId', 'name logo')
      .populate({
        path: 'items.itemId',
        select: 'name subcategoryId',
        populate: {
          path: 'subcategoryId',
          select: 'name categoryId',
          populate: { path: 'categoryId', select: 'name' }
        }
      })
      .sort({ createdAt: -1 });
    res.json({ status: true, data: donations });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// ----------------------------------------------------
// 5. Cart APIs
// ----------------------------------------------------

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, message: 'Access denied. Authentication token required.' });
  }
  next();
};

// Get saved cart
router.get('/cart', requireAuth, async (req, res) => {
  try {
    let cart = await DanCart.findOne({ userId: req.user.id })
      .populate({
        path: 'items.itemId',
        populate: {
          path: 'subcategoryId',
          select: 'name categoryId',
          populate: { path: 'categoryId', select: 'name' }
        }
      });
    if (!cart) {
      cart = new DanCart({ userId: req.user.id, items: [] });
      await cart.save();
    }
    res.json({ status: true, data: cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Save / Update Cart Items
router.post('/cart', requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ status: false, message: 'Items array is required' });
    }

    for (const item of items) {
      if (!item.itemId || item.quantity === undefined || Number(item.quantity) <= 0) {
        return res.status(400).json({ status: false, message: 'Valid itemId and quantity are required for each item' });
      }
      const dbItem = await DanItem.findById(item.itemId);
      if (!dbItem) {
        return res.status(404).json({ status: false, message: `Dan Item not found: ${item.itemId}` });
      }
    }

    let cart = await DanCart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new DanCart({ userId: req.user.id });
    }
    cart.items = items.map(item => ({
      itemId: item.itemId,
      quantity: Number(item.quantity)
    }));
    await cart.save();

    const populated = await DanCart.findById(cart._id).populate({
      path: 'items.itemId',
      populate: {
        path: 'subcategoryId',
        select: 'name categoryId',
        populate: { path: 'categoryId', select: 'name' }
      }
    });

    res.json({ status: true, message: 'Cart items updated successfully', data: populated });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Update Cart Event details & frequency
router.put('/cart/event', requireAuth, async (req, res) => {
  try {
    const { frequency, eventType, eventName, eventDate } = req.body;
    
    if (frequency && !['One-Time', 'Monthly'].includes(frequency)) {
      return res.status(400).json({ status: false, message: 'Invalid frequency. Must be One-Time or Monthly.' });
    }

    const validEventTypes = ['Others', 'Birthday', 'Anniversary', 'Occasion', 'In Memory', 'Festival', 'Shradh / Punya Tithi', 'Shradh/Punya Tithi'];
    if (eventType && !validEventTypes.includes(eventType)) {
      return res.status(400).json({ status: false, message: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` });
    }

    let cart = await DanCart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new DanCart({ userId: req.user.id });
    }

    if (frequency !== undefined) cart.frequency = frequency;
    if (eventType !== undefined) cart.eventType = eventType;
    if (eventName !== undefined) cart.eventName = eventName;
    if (eventDate !== undefined) cart.eventDate = eventDate ? new Date(eventDate) : null;

    await cart.save();

    res.json({ status: true, message: 'Cart event details updated successfully', data: cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Clear Cart
router.delete('/cart', requireAuth, async (req, res) => {
  try {
    let cart = await DanCart.findOne({ userId: req.user.id });
    if (cart) {
      cart.items = [];
      cart.frequency = 'One-Time';
      cart.eventType = 'Others';
      cart.eventName = '';
      cart.eventDate = null;
      await cart.save();
    }
    res.json({ status: true, message: 'Cart cleared successfully', data: cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Checkout / Donate from Cart
router.post('/cart/checkout', requireAuth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const cart = await DanCart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ status: false, message: 'Cart is empty. Cannot checkout.' });
    }

    let totalAmount = 0;
    const resolvedItems = [];
    let primaryNgoId = null;

    for (const itemInput of cart.items) {
      const dbItem = await DanItem.findById(itemInput.itemId);
      if (!dbItem) {
        return res.status(404).json({ status: false, message: `Dan Item not found in cart: ${itemInput.itemId}` });
      }

      if (dbItem.ngoId) {
        primaryNgoId = dbItem.ngoId;
      }

      const subtotal = dbItem.price * itemInput.quantity;
      totalAmount += subtotal;

      resolvedItems.push({
        itemId: dbItem._id,
        name: dbItem.name,
        price: dbItem.price,
        quantity: itemInput.quantity,
        subtotal
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User profile not found' });
    }

    if (paymentMethod === 'Wallet') {
      if ((user.walletBalance || 0) < totalAmount) {
        return res.status(400).json({ status: false, message: 'Insufficient wallet balance. Please top up.' });
      }
      user.walletBalance -= totalAmount;
      await user.save();
    }

    const donationId = `DON-${Date.now().toString().slice(-4)}`;
    const transactionId = `TXN-${Date.now().toString().slice(-4)}`;

    // Derive fund category from first item's subcategory chain
    let cartFundCategory = 'Daan';
    if (resolvedItems.length > 0) {
      const firstCartItem = await DanItem.findById(resolvedItems[0].itemId).populate({
        path: 'subcategoryId',
        populate: { path: 'categoryId', select: 'name' }
      });
      if (firstCartItem?.subcategoryId?.categoryId?.name) {
        cartFundCategory = firstCartItem.subcategoryId.categoryId.name;
      }
    }

    const itemDesc = resolvedItems.map(item => `${item.name} (x${item.quantity})`).join(', ');
    const newTx = new Transaction({
      transactionId,
      type: 'Donation',
      user: user.name || user.phone,
      mobile: user.phone || '',
      fundCategory: cartFundCategory,
      amount: totalAmount,
      status: 'Success',
      date: new Date(),
      item: `Dan: ${itemDesc.slice(0, 100)}`
    });
    await newTx.save();

    const danDonation = new DanDonation({
      donationId,
      donorId: user._id,
      donorName: user.name || 'Anonymous Donor',
      donorPhone: user.phone || '',
      donorEmail: user.email || '',
      items: resolvedItems,
      totalAmount,
      frequency: cart.frequency || 'One-Time',
      eventType: cart.eventType || 'Others',
      eventName: cart.eventName || '',
      eventDate: cart.eventDate,
      paymentMethod: paymentMethod || 'UPI',
      paymentStatus: 'Success',
      ngoId: primaryNgoId,
      transactionId
    });
    await danDonation.save();

    cart.items = [];
    cart.frequency = 'One-Time';
    cart.eventType = 'Others';
    cart.eventName = '';
    cart.eventDate = null;
    await cart.save();

    res.json({
      status: true,
      message: 'Donation completed successfully from cart!',
      data: danDonation
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
