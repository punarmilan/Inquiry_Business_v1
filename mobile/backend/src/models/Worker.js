const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    photoUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    phone: { type: String, required: true, trim: true, maxlength: 24, unique: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    serviceAreas: { type: [String], default: [] },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    completedBookings: { type: Number, default: 0, min: 0 },
    availability: { type: String, enum: ['available', 'busy', 'offline'], default: 'offline', index: true },
    isActive: { type: Boolean, default: true, index: true },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
    internalNotes: { type: String, trim: true, maxlength: 2000, default: '', select: false },
    pricingOverrides: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

workerSchema.index({ city: 1, categories: 1, isActive: 1, availability: 1 });

module.exports = mongoose.model('Worker', workerSchema);
