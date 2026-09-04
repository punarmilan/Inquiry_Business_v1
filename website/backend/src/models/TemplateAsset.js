const mongoose = require('mongoose');

const templateAssetSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 180, default: 'template-asset' },
    mimeType: { type: String, required: true, enum: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'] },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true, min: 1, max: 8_000_000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: true, collection: 'templateassets' }
);

module.exports = mongoose.model('TemplateAsset', templateAssetSchema);
