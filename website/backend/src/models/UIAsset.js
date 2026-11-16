const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  kind: { type: String, enum: ['lottie', 'image'], default: 'lottie', immutable: true },
  mimeType: { type: String, enum: ['application/json', 'image/png', 'image/jpeg'], required: true, immutable: true },
  animation: { type: mongoose.Schema.Types.Mixed, required() { return this.kind !== 'image'; }, immutable: true },
  data: { type: Buffer, required() { return this.kind === 'image'; }, immutable: true, select: false },
  sha256: { type: String, required: true, immutable: true },
  size: { type: Number, required: true, immutable: true }, width: { type: Number, required: true, immutable: true }, height: { type: Number, required: true, immutable: true },
  fps: { type: Number, required: true, immutable: true }, duration: { type: Number, required: true, immutable: true },
  enabled: { type: Boolean, default: true }, archived: { type: Boolean, default: false }, assetVersion: { type: Number, default: 1, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
}, { timestamps: true, collection: 'uiassets', strict: 'throw', minimize: false });
schema.pre('save', function () { if (!this.isNew) throw new ApiError(409, 'Use the versioned UI asset API', 'UI_ASSET_IMMUTABLE'); });
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany'], function () {
  const update = this.getUpdate();
  if (!this.getFilter().assetVersion || this.getOptions().upsert || Array.isArray(update)
    || !update || Object.entries(update).some(([operator, values]) => !['$set', '$inc', '$setOnInsert'].includes(operator)
      || Object.keys(values).some((key) => !['name', 'enabled', 'archived', 'assetVersion', 'updatedAt', 'createdAt'].includes(key)))) {
    throw new ApiError(409, 'Animation bytes are immutable', 'UI_ASSET_IMMUTABLE');
  }
});
module.exports = mongoose.model('UIAsset', schema);
