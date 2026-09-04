const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
    title: String, description: String, category: String, originalPrice: Number, offerPrice: Number,
    discountPercentage: Number, imageUrls: [String], cardDesign: { templateId: String, templateVersion: Number, templateSource: String, previewUrl: String, avatarId: String, primaryColor: String, secondaryColor: String, layout: String, customizations: mongoose.Schema.Types.Mixed, titleFontSize: Number, descriptionFontSize: Number, fontWeight: String, fontStyle: String, textAlign: String }, startsAt: Date, expiresAt: Date, address: String,
    locality: String, location: { type: { type: String }, coordinates: [Number] }, phone: String, whatsapp: String, terms: String,
    status: { type: String, enum: ['pending_review', 'approved', 'rejected', 'suspended'], default: 'pending_review' },
    moderationReason: { type: String, default: '' }, moderatedBy: mongoose.Schema.Types.ObjectId, moderatedAt: Date,
    isActive: { type: Boolean, default: true }, isFeatured: { type: Boolean, default: false }, featuredUntil: Date,
    priorityRank: { type: Number, default: 0 }, analytics: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
module.exports = mongoose.model('Offer', schema);
