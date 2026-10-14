const mongoose = require('mongoose');

const danSubcategorySchema = new mongoose.Schema({
  subcategoryId: { type: String, required: true, unique: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DanCategory', required: true },
  name: { type: String, required: true },
  imageUrl: { type: String, default: null },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  creatorType: { type: String, enum: ['Admin', 'NGO'], default: 'Admin' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null }
}, { timestamps: true });

danSubcategorySchema.index({ categoryId: 1, status: 1 });
danSubcategorySchema.index({ status: 1 });
danSubcategorySchema.index({ name: 1 });

module.exports = mongoose.model('DanSubcategory', danSubcategorySchema);
