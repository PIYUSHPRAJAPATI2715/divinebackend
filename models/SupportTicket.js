const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  userPhone: { type: String, default: '' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' },
  reply: { type: String, default: '' },
  repliedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
