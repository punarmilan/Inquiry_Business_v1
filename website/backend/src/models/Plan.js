const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true }, code: { type: String, required: true, uppercase: true, unique: true }, description: String,
    price: { type: Number, required: true, min: 0 }, billingPeriod: { type: String, enum: ['monthly', 'quarterly', 'yearly', 'custom'] },
    durationDays: Number, offerPostingLimit: Number, maximumActiveOffers: Number, featuredOfferAllowance: Number,
    imagesPerOffer: Number, analyticsAccess: Boolean, priorityRanking: Number, verificationBenefit: Boolean,
    isActive: { type: Boolean, default: true }, sortOrder: Number,
  },
  { timestamps: true }
);
module.exports = mongoose.model('Plan', schema);
