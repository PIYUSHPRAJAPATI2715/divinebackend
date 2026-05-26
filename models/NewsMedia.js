const mongoose = require('mongoose');

const newsMediaSchema = new mongoose.Schema({
  newsId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  source: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  publishedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Published', 'Draft'], default: 'Published' }
}, { timestamps: true });

module.exports = mongoose.model('NewsMedia', newsMediaSchema);
