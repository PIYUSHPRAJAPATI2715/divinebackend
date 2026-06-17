const express = require('express');
const router = express.Router();
const SupportTicket = require('../../models/SupportTicket');
const Coupon = require('../../models/Coupon');
const User = require('../../models/User');

// Support Tickets endpoints
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportTicket.find().sort({ createdAt: -1 });
    res.json({ status: true, data: tickets });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) {
      return res.status(400).json({ status: false, message: 'Reply content is required' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    ticket.reply = reply;
    ticket.status = 'Resolved';
    ticket.repliedAt = new Date();
    await ticket.save();

    res.json({ status: true, message: 'Ticket response submitted successfully', data: ticket });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Coupons endpoints
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ status: true, data: coupons });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

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
