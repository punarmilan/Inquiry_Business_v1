const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    name: String, slug: { type: String, unique: true }, description: String, icon: String, imageUrl: String,
    basePrice: Number, priceUnit: { type: String, enum: ['fixed', 'hourly', 'inspection'] },
    cityAvailability: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }], isActive: Boolean, sortOrder: Number,
  },
  { timestamps: true }
);
module.exports = mongoose.model('ServiceCategory', schema);
