const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true, index: true },
    quota: {
      offerPostingLimit: { type: Number, required: true },
      maximumActiveOffers: { type: Number, required: true },
      featuredOfferAllowance: { type: Number, required: true },
      imagesPerOffer: { type: Number, required: true },
    },
    usage: {
      offersPosted: { type: Number, default: 0, min: 0 },
      featuredOffersUsed: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ business: 1, status: 1, startsAt: -1, endsAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
