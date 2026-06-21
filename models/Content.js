const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // 'privacy', 'terms', 'about'
  slug: { type: String, unique: true, sparse: true }, // slug equivalent (e.g. 'privacy-policy')
  title: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

contentSchema.pre('validate', function() {
  if (!this.slug && this.key) {
    this.slug = this.key;
  }
  if (!this.key && this.slug) {
    this.key = this.slug;
  }
});

module.exports = mongoose.model('Content', contentSchema);
