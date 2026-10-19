const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Admin' },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'social_admin', 'astro_admin'], 
    default: 'superadmin' 
  },
  platform: { 
    type: String, 
    enum: ['all', 'social', 'astro'], 
    default: 'all' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
