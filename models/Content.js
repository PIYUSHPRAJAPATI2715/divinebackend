const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // 'privacy', 'terms', 'about', 'refund', 'daan_guidelines'
  slug: { type: String, unique: true, sparse: true }, // slug equivalent (e.g. 'privacy-policy')
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, default: 'static_page' },
  metaDescription: { type: String, default: '' },
  lastUpdatedBy: { type: String, default: 'Admin' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

contentSchema.pre('validate', function() {
  if (!this.slug && this.key) {
    this.slug = this.key.toLowerCase().replace(/_/g, '-');
  }
  if (!this.key && this.slug) {
    this.key = this.slug.toLowerCase().replace(/-/g, '_');
  }
});

module.exports = mongoose.model('Content', contentSchema);
