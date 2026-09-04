const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', default: null, index: true },
    type: { type: String, enum: ['subscription', 'service', 'promotion', 'refund'], required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceBooking', default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', enum: ['INR'] },
    provider: { type: String, default: 'manual', trim: true, maxlength: 40 },
    providerOrderId: { type: String, trim: true, maxlength: 200, default: '' },
    providerPaymentId: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: ['created', 'pending_verification', 'verified', 'failed', 'refunded'], default: 'created', index: true },
    planSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    failureReason: { type: String, trim: true, maxlength: 500, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

paymentSchema.index({ type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
