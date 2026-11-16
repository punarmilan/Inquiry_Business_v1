const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { validateConfig } = require('../validators/ui.validator');

const schema = new mongoose.Schema({
  kind: { type: String, enum: ['page', 'theme'], required: true, immutable: true },
  key: { type: String, required: true, immutable: true },
  status: { type: String, enum: ['draft', 'published'], required: true, immutable: true },
  draftVersion: { type: Number, required: true, min: 1 },
  config: { type: mongoose.Schema.Types.Mixed, required: true, validate: { validator(value) {
    const config = validateConfig(value);
    return config.kind === this.kind && config.key === this.key;
  }, message: 'Invalid UI revision configuration' } },
  sourceRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UIRevision', default: null, immutable: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, immutable: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  publishedAt: { type: Date, default: null, immutable: true },
}, { timestamps: true, collection: 'uirevisions', strict: 'throw', minimize: false });

schema.index({ kind: 1, key: 1, status: 1, createdAt: -1 });
schema.pre('save', function () {
  if (!this.isNew) throw new ApiError(409, 'Save drafts through the versioned update API', 'UI_REVISION_IMMUTABLE');
});
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany'], function () {
  const update = this.getUpdate();
  const allowed = new Set(['config', 'updatedBy', 'updatedAt', 'draftVersion']);
  if (this.getFilter().status !== 'draft' || this.getOptions().upsert || Array.isArray(update)
    || (update && Object.entries(update).some(([operator, values]) => !['$set', '$inc', '$setOnInsert'].includes(operator)
      || Object.keys(values).some((key) => !allowed.has(key) && !(operator === '$setOnInsert' && key === 'createdAt'))))) {
    throw new ApiError(409, 'Published UI revisions are immutable', 'UI_REVISION_IMMUTABLE');
  }
});

module.exports = mongoose.model('UIRevision', schema);
