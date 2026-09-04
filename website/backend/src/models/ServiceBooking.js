const mongoose = require('mongoose');
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
const schema = new mongoose.Schema(
  {
    bookingNumber: { type: String, unique: true }, customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' }, category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
    dispatchedProviders: { type: [providerDispatchSchema], default: [] },
    address: String, locality: String,
    location: { type: { type: String }, coordinates: [Number] }, scheduleType: String, scheduledFor: Date,
    problemDescription: String, priceEstimate: Number, finalPrice: Number,
    status: { type: String, enum: ['requested', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'] },
    statusHistory: [mongoose.Schema.Types.Mixed], paymentStatus: String, cancellationReason: String, rating: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
module.exports = mongoose.model('ServiceBooking', schema);
