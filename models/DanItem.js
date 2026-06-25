const mongoose = require('mongoose');

const danItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'DanSubcategory', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  unit: { type: String, default: 'Unit' },
  imageUrl: { type: String, default: null },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  creatorType: { type: String, enum: ['Admin', 'NGO'], default: 'Admin' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null }
}, { timestamps: true });

module.exports = mongoose.model('DanItem', danItemSchema);
