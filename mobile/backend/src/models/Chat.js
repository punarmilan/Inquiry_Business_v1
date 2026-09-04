const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceBooking',
      default: null,
      index: true,
    },
    contextType: {
      type: String,
      enum: ['job', 'booking', 'business', 'support'],
      default: 'job',
      index: true,
    },
    poster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    unreadCount: {
      poster: { type: Number, default: 0, min: 0 },
      applicant: { type: Number, default: 0, min: 0 },
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

// One private thread per (job, applicant) pair — the poster is implied by the job.
chatSchema.index(
  { job: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { job: { $type: 'objectId' } } }
);
chatSchema.index(
  { booking: 1, applicant: 1 },
  { unique: true, partialFilterExpression: { booking: { $type: 'objectId' } } }
);
chatSchema.index({ poster: 1, lastMessageAt: -1 });
chatSchema.index({ applicant: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
