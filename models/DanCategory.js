const mongoose = require('mongoose');

const danCategorySchema = new mongoose.Schema({
  categoryId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: null },
  imageUrl: { type: String, default: null },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  creatorType: { type: String, enum: ['Admin', 'NGO'], default: 'Admin' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null }
}, { timestamps: true });

module.exports = mongoose.model('DanCategory', danCategorySchema);
