const express = require('express');
const router = express.Router();
const SupportSetting = require('../models/SupportSetting');
const SupportTicket = require('../models/SupportTicket');

// Get public support desk contact details and active FAQs
router.get('/info', async (req, res) => {
  try {
    let settings = await SupportSetting.findOne({ key: 'global_support_settings' });
    if (!settings) {
      settings = {
        helplinePhone: '+91 9876543210',
        supportEmail: 'support@divinenakshatra.org',
        whatsappNumber: '+91 9876543210',
        operatingHours: 'Monday to Saturday, 9:00 AM - 7:00 PM IST',
        officeAddress: 'Divine Nakshatra Foundation, 108 Sacred Way, Spiritual Complex, New Delhi - 110001, India',
        escalationNote: 'For urgent medical or emergency donor assistance, helpline ticketing is monitored 24/7.',
        faqs: []
      };
    }

    const activeFaqs = (settings.faqs || [])
      .filter(f => f.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    res.json({
      status: true,
      data: {
        helplinePhone: settings.helplinePhone,
        supportEmail: settings.supportEmail,
        whatsappNumber: settings.whatsappNumber,
        operatingHours: settings.operatingHours,
        officeAddress: settings.officeAddress,
        escalationNote: settings.escalationNote,
        faqs: activeFaqs
      },
      helplinePhone: settings.helplinePhone,
      supportEmail: settings.supportEmail,
      whatsappNumber: settings.whatsappNumber,
      operatingHours: settings.operatingHours,
      faqs: activeFaqs
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Submit a support inquiry or ticket from mobile app or web
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message, category = 'General' } = req.body;

    if (!name || (!email && !phone) || !message) {
      return res.status(400).json({
        status: false,
        message: 'Name, Contact Info (Email or Phone), and Message are required.'
      });
    }

    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;
    const ticket = new SupportTicket({
      ticketNumber,
      userName: name,
      userEmail: email || '',
      userPhone: phone || '',
      category,
      subject: subject || 'General Inquiry',
      message,
      status: 'Open'
    });

    await ticket.save();

    res.status(201).json({
      status: true,
      message: 'Your inquiry has been received. Our support team will connect with you shortly.',
      ticketNumber,
      data: ticket
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
