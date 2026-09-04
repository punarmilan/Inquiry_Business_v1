const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

const providerDispatchSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
    status: { type: String, enum: ['invited', 'accepted', 'rejected', 'already_accepted', 'expired'], default: 'invited' },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: false }
);

const serviceBookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', default: null, index: true },
    dispatchedProviders: { type: [providerDispatchSchema], default: [] },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    locality: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: geoPointSchema, required: true },
    scheduleType: { type: String, enum: ['now', 'later'], required: true },
    scheduledFor: { type: Date, required: true, index: true },
    problemDescription: { type: String, trim: true, maxlength: 2000, default: '' },
    priceEstimate: { type: Number, required: true, min: 0 },
    finalPrice: { type: Number, min: 0, default: null },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refunded'], default: 'unpaid', index: true },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: '' },
    rating: {
      stars: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, trim: true, maxlength: 1000, default: '' },
      ratedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

serviceBookingSchema.index({ location: '2dsphere' });
serviceBookingSchema.index({ customer: 1, createdAt: -1 });
serviceBookingSchema.index({ worker: 1, status: 1, scheduledFor: 1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);
