const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { PAGE_KEYS } = require('../validators/ui.validator');

const schema = new mongoose.Schema({
  schemaVersion: { type: Number, enum: [1], required: true },
  rendererVersion: { type: Number, enum: [1, 2, 3, 4, 5, 6], required: true },
  generation: { type: Number, min: 1, required: true },
  pageRevisionIds: { type: mongoose.Schema.Types.Mixed, required: true, default: () => ({}), validate: {
    validator: (value) => value && Object.getPrototypeOf(value) === Object.prototype
      && Object.entries(value).every(([key, id]) => PAGE_KEYS.includes(key) && /^[a-fA-F0-9]{24}$/.test(String(id))),
    message: 'Invalid UI page revision references',
  } },
  themeRevisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UIRevision', default: null },
  campaignRevisionIds: { type: [mongoose.Schema.Types.ObjectId], default: [], validate: (value) => value.length === 0 },
  previousReleaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'UIRelease', default: null },
  rolledBackFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'UIRelease', default: null },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  reason: { type: String, required: true, minlength: 3, maxlength: 500 },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'uireleases', strict: 'throw', minimize: false });

schema.pre('save', function () {
  if (!this.isNew) throw new ApiError(409, 'Published UI releases are immutable', 'UI_RELEASE_IMMUTABLE');
});
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany'], function () {
  throw new ApiError(409, 'Published UI releases are immutable', 'UI_RELEASE_IMMUTABLE');
});

module.exports = mongoose.model('UIRelease', schema);
