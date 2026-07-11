const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true }, // in INR
  discountPrice: { type: Number, default: 0 },
  imageUrl: { type: String, default: '' },
  category: { type: String, enum: ['Books', 'Gadgets', 'Crystals', 'Incense', 'Other'], default: 'Books' },
  stock: { type: Number, default: 10 },
  rating: { type: Number, default: 4.5 },
  vendorName: { type: String, default: 'Divine Mart' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
