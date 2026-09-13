const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    // Providers are directory entries now. They do not need a mobile account.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true }, name: String, photoUrl: String,
    phone: { type: String, unique: true }, whatsapp: { type: String, trim: true, default: '' }, categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    experienceYears: Number, city: { type: mongoose.Schema.Types.ObjectId, ref: 'City' }, serviceAreas: [String],
    ratingAverage: Number, ratingCount: Number, completedBookings: Number,
    availability: { type: String, enum: ['available', 'busy', 'offline'] }, isActive: Boolean,
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'] }, internalNotes: { type: String, select: false },
    pricingOverrides: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
module.exports = mongoose.model('Worker', schema);
