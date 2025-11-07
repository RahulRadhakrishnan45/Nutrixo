const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  offer_name: { type: String, required: true, trim: true, unique: true },
  offer_type: { 
    type: String, 
    required: true, 
    enum: ['category', 'product', 'brand'],
  },
  discount_percent: { type: Number, required: true, min: 1, max: 90 },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  applies_to_type: { 
    type: String, 
    enum: ['category', 'product', 'brand'], 
    required: true 
  },
  applies_to: [{ type: mongoose.Schema.Types.ObjectId, refPath: 'applies_to_type' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);
