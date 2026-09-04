const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' }, owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }, payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', unique: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'] }, startsAt: Date, endsAt: Date,
    quota: mongoose.Schema.Types.Mixed, usage: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
module.exports = mongoose.model('Subscription', schema);
