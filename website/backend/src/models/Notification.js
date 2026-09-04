const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'application_accepted', 'application_rejected', 'new_application', 'new_message',
        'nearby_featured_offer', 'offer_expiring', 'offer_approved', 'offer_rejected',
        'business_approved', 'business_rejected',
        'offer_milestone', 'plan_expiring', 'booking_confirmed', 'worker_assigned',
        'worker_arriving', 'booking_completed', 'payment_update',
        'provider_booking_request', 'provider_booking_closed', 'provider_booking_status',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, trim: true, maxlength: 300, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
schema.index({ user: 1, createdAt: -1 });
// Mirrors mobile-backend/src/models/Notification.js — same collection, kept as a separate
// copy (this service has no socket server, so it only writes; mobile-backend still owns
// the live push to a connected app via `notification:new`).
module.exports = mongoose.model('Notification', schema);
