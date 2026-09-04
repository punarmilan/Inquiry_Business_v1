const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' }, type: String, plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceBooking' }, amount: Number, currency: String, provider: String,
    providerOrderId: String, providerPaymentId: String,
    status: { type: String, enum: ['created', 'pending_verification', 'verified', 'failed', 'refunded'] },
    planSnapshot: mongoose.Schema.Types.Mixed, verifiedAt: Date, verifiedBy: mongoose.Schema.Types.ObjectId,
    failureReason: String, metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
module.exports = mongoose.model('Payment', schema);
