const mongoose = require('mongoose');

const supportSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global_support_settings',
    unique: true
  },
  helplinePhone: {
    type: String,
    default: '+91 9876543210'
  },
  supportEmail: {
    type: String,
    default: 'support@divinenakshatra.org'
  },
  whatsappNumber: {
    type: String,
    default: '+91 9876543210'
  },
  operatingHours: {
    type: String,
    default: 'Monday to Saturday, 9:00 AM - 7:00 PM IST'
  },
  officeAddress: {
    type: String,
    default: 'Divine Nakshatra Foundation, 108 Sacred Way, Spiritual Complex, New Delhi - 110001, India'
  },
  escalationNote: {
    type: String,
    default: 'For emergency donor or beneficiary assistance, priority ticketing is available 24/7.'
  },
  faqs: [
    {
      id: { type: String },
      question: { type: String, required: true },
      answer: { type: String, required: true },
      category: { type: String, default: 'General' },
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('SupportSetting', supportSettingSchema);
