const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const businessSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 7_000_000, default: '' },
    coverImageUrl: { type: String, trim: true, maxlength: 7_000_000, default: '' },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    locality: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: geoPointSchema, required: true },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    whatsapp: { type: String, trim: true, maxlength: 24, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 200, default: '' },
    website: { type: String, trim: true, maxlength: 2048, default: '' },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    verificationNote: { type: String, trim: true, maxlength: 500, default: '' },
    verificationSubmittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    isActive: { type: Boolean, default: true, index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

businessSchema.index({ location: '2dsphere' });
businessSchema.index({ city: 1, isActive: 1, verificationStatus: 1 });

module.exports = mongoose.model('Business', businessSchema);
