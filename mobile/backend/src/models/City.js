const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
        },
        message: 'Coordinates must be [longitude, latitude].',
      },
    },
  },
  { _id: false }
);

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    center: { type: geoPointSchema, required: true },
    serviceRadiusKm: { type: Number, default: 10, min: 1, max: 100 },
    localities: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    offersEnabled: { type: Boolean, default: false, index: true },
    servicesEnabled: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

citySchema.index({ center: '2dsphere' });
citySchema.index({ isActive: 1, offersEnabled: 1, name: 1 });
citySchema.index({ isActive: 1, servicesEnabled: 1, name: 1 });

module.exports = mongoose.model('City', citySchema);
