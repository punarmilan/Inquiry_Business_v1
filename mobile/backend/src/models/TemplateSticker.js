const mongoose = require('mongoose');

const templateStickerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120, unique: true },
    kind: { type: String, enum: ['image', 'emoji'], required: true, default: 'emoji' },
    imageUrl: { type: String, trim: true, maxlength: 7_000_000, default: '' },
    emoji: { type: String, trim: true, maxlength: 20, default: '' },
    sortOrder: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
  { timestamps: true, collection: 'templatestickers' }
);

templateStickerSchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model('TemplateSticker', templateStickerSchema);
