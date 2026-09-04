const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    icon: { type: String, trim: true, maxlength: 100, default: 'tools' },
    imageUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    basePrice: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, enum: ['fixed', 'hourly', 'inspection'], default: 'inspection' },
    cityAvailability: [{ type: mongoose.Schema.Types.ObjectId, ref: 'City' }],
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
