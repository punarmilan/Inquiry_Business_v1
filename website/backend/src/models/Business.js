const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    name: String, slug: String, category: String, description: String, logoUrl: String, coverImageUrl: String,
    address: String, locality: String,
    location: { type: { type: String }, coordinates: [Number] },
    phone: String, whatsapp: String, email: String, website: String,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'suspended'], default: 'pending' },
    verificationNote: { type: String, default: '' },
    verificationSubmittedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 }, ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Business', schema);
