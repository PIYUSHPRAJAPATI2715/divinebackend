const mongoose = require('mongoose');

const danCartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'DanItem', required: true },
      quantity: { type: Number, required: true, default: 1 }
    }
  ],
  frequency: { type: String, enum: ['One-Time', 'Monthly'], default: 'One-Time' },
  eventType: { 
    type: String, 
    enum: ['Others', 'Birthday', 'Anniversary', 'Occasion', 'In Memory', 'Festival', 'Shradh / Punya Tithi', 'Shradh/Punya Tithi'], 
    default: 'Others' 
  },
  eventName: { type: String, default: '' },
  eventDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('DanCart', danCartSchema);
