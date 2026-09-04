const mongoose = require('mongoose');

// Mirrors website-backend/src/models/Report.js — same collection ("reports"), kept as a
// separate copy since mobile-backend and website-backend are independent services.
// Mobile backend only ever creates reports (user-facing); website backend lists/moderates
// them (admin-facing) — see reportController.js in each service.
const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['job', 'user', 'business', 'offer', 'service_booking'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
