const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const cardDesignSchema = new mongoose.Schema(
  {
    templateId: { type: String, trim: true, maxlength: 80 },
    templateVersion: { type: Number, min: 1 },
    templateSource: { type: String, enum: ['admin', 'system', 'custom'], default: 'system' },
    previewUrl: { type: String, trim: true, maxlength: 7_000_000 },
    // Snapshot the admin poster definition with the offer so published cards
    // keep the exact template version selected by the business owner.
    canvas: { type: mongoose.Schema.Types.Mixed, default: null },
    avatarId: { type: String, trim: true, maxlength: 80 },
    primaryColor: { type: String, trim: true, maxlength: 16 },
    secondaryColor: { type: String, trim: true, maxlength: 16 },
    layout: { type: String, enum: ['right', 'left', 'bottom', 'center'], default: 'right' },
    customizations: { type: mongoose.Schema.Types.Mixed, default: {} },
    titleFontSize: { type: Number, min: 16, max: 56, default: 30 },
    descriptionFontSize: { type: Number, min: 11, max: 28, default: 16 },
    fontWeight: { type: String, enum: ['500', '600', '700', '800', '900'], default: '900' },
    fontStyle: { type: String, enum: ['normal', 'italic'], default: 'normal' },
    textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  },
  { _id: false }
);

const analyticsSchema = new mongoose.Schema(
  {
    impressions: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    businessProfileVisits: { type: Number, default: 0, min: 0 },
    saves: { type: Number, default: 0, min: 0 },
    shares: { type: Number, default: 0, min: 0 },
    callClicks: { type: Number, default: 0, min: 0 },
    whatsappClicks: { type: Number, default: 0, min: 0 },
    directionClicks: { type: Number, default: 0, min: 0 },
    claims: { type: Number, default: 0, min: 0 },
    redemptions: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    originalPrice: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    imageUrls: { type: [String], default: [] },
    cardDesign: { type: cardDesignSchema, default: undefined },
    startsAt: { type: Date, required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    locality: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: geoPointSchema, required: true },
    phone: { type: String, trim: true, maxlength: 24, default: '' },
    whatsapp: { type: String, trim: true, maxlength: 24, default: '' },
    terms: { type: String, trim: true, maxlength: 3000, default: '' },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'suspended'],
      default: 'pending_review',
      index: true,
    },
    moderationReason: { type: String, trim: true, maxlength: 500, default: '' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    moderatedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date, default: null },
    priorityRank: { type: Number, default: 0, min: 0, max: 1000 },
    analytics: { type: analyticsSchema, default: () => ({}) },
    claimConfiguration: {
      enabled: { type: Boolean, default: false },
      redemptionMode: { type: String, enum: ['none', 'code', 'qr'], default: 'none' },
    },
  },
  { timestamps: true }
);

offerSchema.index({ location: '2dsphere' });
offerSchema.index({ status: 1, isActive: 1, startsAt: 1, expiresAt: 1 });
offerSchema.index({ city: 1, category: 1, status: 1, expiresAt: 1 });
offerSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Offer', offerSchema);
