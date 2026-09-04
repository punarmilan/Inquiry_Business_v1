const mongoose = require('mongoose');

const providerApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20, index: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true }],
    experienceYears: { type: Number, min: 0, max: 60, default: 0 },
    serviceAreas: { type: [String], default: [] },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    termsAccepted: { type: Boolean, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    approvedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  },
  { timestamps: true, collection: 'providerapplications' },
);

providerApplicationSchema.index({ phone: 1, status: 1 });

module.exports = mongoose.model('ProviderApplication', providerApplicationSchema);
