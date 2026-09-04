const TemplateSticker = require('../models/TemplateSticker');
const asyncHandler = require('../utils/asyncHandler');

const listStickers = asyncHandler(async (_req, res) => {
  const stickers = await TemplateSticker.find({ isActive: true })
    .select('-createdBy -updatedBy -__v')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  res.json({ success: true, data: stickers });
});

module.exports = { listStickers };
