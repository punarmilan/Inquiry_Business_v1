const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, unique: true },
    center: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    serviceRadiusKm: { type: Number, default: 10, min: 1, max: 100 },
    localities: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    offersEnabled: { type: Boolean, default: false },
    servicesEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ center: '2dsphere' });
module.exports = mongoose.model('City', schema);
