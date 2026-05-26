const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  postId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['Blog', 'Video'], required: true },
  content: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  author: { type: String, required: true },
  category: { type: String, required: true },
  reportsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Flagged', 'Removed'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
