const mongoose = require('mongoose');

const danDonationSchema = new mongoose.Schema({
  donationId: { type: String, required: true, unique: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  donorName: { type: String, default: 'Anonymous Donor' },
  donorPhone: { type: String, default: '' },
  donorEmail: { type: String, default: '' },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'DanItem', required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      subtotal: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  frequency: { type: String, enum: ['One-Time', 'Monthly'], default: 'One-Time' },
  eventType: { 
    type: String, 
    enum: ['Others', 'Birthday', 'Anniversary', 'Occasion', 'In Memory', 'Festival', 'Shradh / Punya Tithi', 'Shradh/Punya Tithi'], 
    default: 'Others' 
  },
  eventName: { type: String, default: '' },
  eventDate: { type: Date, default: null },
  paymentMethod: { type: String, default: 'UPI' },
  paymentStatus: { type: String, enum: ['Pending', 'Success', 'Failed'], default: 'Success' },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'NGO', default: null },
  transactionId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('DanDonation', danDonationSchema);
