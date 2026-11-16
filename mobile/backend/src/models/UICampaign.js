const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  identifier: { type: String, required: true, unique: true, match: /^[a-z0-9][a-z0-9-]{2,79}$/ },
  name: { type: String, required: true, maxlength: 120 },
  festival: { type: String, enum: ['diwali', 'holi', 'christmas', 'new-year', 'custom'], default: 'custom' },
  releaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'UIRelease', required: true },
  animationAssetId: { type: mongoose.Schema.Types.ObjectId, ref: 'UIAsset', default: null },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  cityIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'City', default: [] },
  priority: { type: Number, min: 0, max: 1000, default: 0 },
  state: { type: String, enum: ['draft', 'scheduled', 'disabled'], default: 'draft' },
  enabled: { type: Boolean, default: true }, version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  audit: { type: [{ actor: mongoose.Schema.Types.ObjectId, at: Date, reason: String, version: Number, changes: mongoose.Schema.Types.Mixed }], default: [] },
}, { timestamps: true, collection: 'uicampaigns', strict: 'throw' });
schema.index({ state: 1, enabled: 1, endsAt: 1, startsAt: 1 });
module.exports = mongoose.model('UICampaign', schema);
