const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, required: true, min: 0 },
    billingPeriod: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'custom'], default: 'monthly' },
    durationDays: { type: Number, min: 1, max: 730, default: 30 },
    offerPostingLimit: { type: Number, min: -1, default: 3 },
    maximumActiveOffers: { type: Number, min: -1, default: 3 },
    featuredOfferAllowance: { type: Number, min: 0, default: 0 },
    imagesPerOffer: { type: Number, min: 1, max: 20, default: 3 },
    analyticsAccess: { type: Boolean, default: false },
    priorityRanking: { type: Number, min: 0, max: 100, default: 0 },
    verificationBenefit: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
