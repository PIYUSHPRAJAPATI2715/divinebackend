const mongoose = require('mongoose');

const lmsEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: {
    type: String,
    enum: ['Concounts', 'Workshops', 'Webinars', 'Festivals', 'Competitions', 'Career Events'],
    default: 'Webinars'
  },
  banner: { type: String, default: '' },
  venue: { type: String, default: 'Online' },
  dateTime: { type: Date, required: true },
  timeZone: { type: String, default: 'IST' },
  language: { type: String, default: 'English' },
  organizerName: { type: String, default: 'AstroLearning Private Limited' },
  ticketPricePlan: {
    basic: { type: Number, default: 0 },
    premium: { type: Number, default: 499 },
    vip: { type: Number, default: 999 }
  },
  speakers: [
    {
      name: { type: String },
      biography: { type: String },
      socialLink: { type: String }
    }
  ],
  sponsors: [
    {
      name: { type: String },
      logo: { type: String }
    }
  ],
  attendees: [
    {
      userId: { type: String },
      name: { type: String },
      ticketType: { type: String, enum: ['Basic', 'Premium', 'VIP'], default: 'Basic' },
      checkedIn: { type: Boolean, default: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('LmsEvent', lmsEventSchema);
