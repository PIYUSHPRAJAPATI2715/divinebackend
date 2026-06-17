const express = require('express');
const router = express.Router();
const SupportTicket = require('../../../models/SupportTicket');

// Get all support tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportTicket.find().sort({ createdAt: -1 });
    res.json({ status: true, data: tickets });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Reply and resolve ticket
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

module.exports = router;
