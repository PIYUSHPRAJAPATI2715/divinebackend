const express = require('express');
const router = express.Router();
const Coupon = require('../../../models/Coupon');

// Get all coupons
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ status: true, data: coupons });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create new coupon
router.post('/coupons', async (req, res) => {
  try {
    const { code, description, discountType, value, minDonation, expiryDate } = req.body;

    if (!code || !description || !value || !expiryDate) {
      return res.status(400).json({ status: false, message: 'Code, description, value, and expiryDate are required' });
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase().trim(),
      description,
      discountType: discountType || 'Flat',
      value: Number(value),
      minDonation: Number(minDonation || 0),
      expiryDate: new Date(expiryDate),
      isActive: true
    });

    await newCoupon.save();
    res.status(201).json({ status: true, message: 'Voucher created successfully', data: newCoupon });
  } catch (err) {
    res.status(400).json({ status: false, message: err.message });
  }
});

// Delete coupon
router.delete('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ status: false, message: 'Voucher not found' });
    }
    res.json({ status: true, message: 'Voucher deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
