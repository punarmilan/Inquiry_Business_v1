const mongoose = require('mongoose');

// Last-known location per (service booking, user). Live updates are sent over
// Socket.IO; this record lets a participant see the latest marker after opening
// or reconnecting to the tracking screen.
const serviceBookingLocationShareSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceBooking',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isSharing: { type: Boolean, default: false },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    accuracy: Number,
    heading: Number,
    speed: Number,
  },
  { timestamps: true }
);

serviceBookingLocationShareSchema.index({ booking: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ServiceBookingLocationShare', serviceBookingLocationShareSchema);
