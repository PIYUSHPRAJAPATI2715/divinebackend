const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Campaign', 'NGO', 'Daan'],
    required: true,
    default: 'Daan'
  },
  subject: {
    type: String,
    required: true
  },
  bodyHtml: {
    type: String,
    required: true
  },
  variables: [{
    type: String
  }],
  includeDaanReceipt: {
    type: Boolean,
    default: true
  },
  receiptTitle: {
    type: String,
    default: 'Official Daan & Donation Receipt'
  },
  receiptNote: {
    type: String,
    default: 'Thank you for choosing to support our noble causes. This receipt serves as an official confirmation of your voluntary contribution.'
  },
  taxExemption80G: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
