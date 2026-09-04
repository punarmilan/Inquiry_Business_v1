const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['text', 'image', 'number', 'color', 'date', 'select'], default: 'text' },
    editable: { type: Boolean, default: true },
    required: { type: Boolean, default: false },
    optional: { type: Boolean, default: false },
    maxLength: { type: Number, min: 1, max: 5000, default: 120 },
    options: { type: [String], default: [] },
    defaultValue: { type: String, trim: true, maxlength: 5000, default: '' },
  },
  { _id: false }
);

const offerTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    previewUrl: { type: String, trim: true, maxlength: 7_000_000, default: '' },
    // Optional Canva-style poster definition. Kept as Mixed so admins can
    // add new element properties without a mobile/backend migration.
    canvas: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    primaryColor: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: '#4F9FE8' },
    secondaryColor: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: '#2167BD' },
    layout: { type: String, enum: ['right', 'left', 'bottom', 'center'], default: 'right' },
    avatarId: { type: String, trim: true, maxlength: 80, default: 'avatar-01' },
    editableFields: { type: [fieldSchema], default: () => [] },
    allowColorChange: { type: Boolean, default: true },
    allowLayoutChange: { type: Boolean, default: true },
    allowAvatarChange: { type: Boolean, default: true },
    version: { type: Number, min: 1, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
  },
  { timestamps: true, collection: 'offertemplates' }
);

offerTemplateSchema.index({ isActive: 1, category: 1, sortOrder: 1 });

module.exports = mongoose.model('OfferTemplate', offerTemplateSchema);
