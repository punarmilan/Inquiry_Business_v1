const OfferTemplate = require('../models/OfferTemplate');
const asyncHandler = require('../utils/asyncHandler');

const listTemplates = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category && req.query.category.toLowerCase() !== 'all') filter.category = req.query.category;
  const templates = await OfferTemplate.find(filter)
    .select('-createdBy -updatedBy -__v')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();
  res.json({ success: true, data: templates });
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await OfferTemplate.findOne({ _id: req.params.id, isActive: true })
    .select('-createdBy -updatedBy -__v')
    .lean();
  if (!template) return res.status(404).json({ success: false, message: 'Offer template not found', code: 'TEMPLATE_NOT_FOUND' });
  res.json({ success: true, template });
});

module.exports = { listTemplates, getTemplate };
