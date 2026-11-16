const UIAsset = require('../models/UIAsset');
const UIRevision = require('../models/UIRevision');
const ApiError = require('../utils/ApiError');
const { validateAnimation } = require('../validators/uiAnimation');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const assetIds = (base) => [...new Set(Object.values(base.pages).flatMap((page) => [...page.slots.beforeContent, ...page.slots.afterContent])
  .map((block) => ['lottie', 'image', 'homeCard'].includes(block.type) ? block.props.assetId : block.type === 'heroBanner' ? block.props.imageAssetId : null).filter(Boolean))].sort();
const metadata = (row) => ({ id: String(row._id), sha256: row.sha256, width: row.width, height: row.height, fps: row.fps, duration: row.duration, size: row.size,
  ...(row.kind === 'image' ? { kind: 'image', mimeType: row.mimeType } : {}) });
const resolveAssets = async (base) => {
  const ids = assetIds(base);
  if (!ids.length) return {};
  if (ids.length > require('../validators/uiVisual.json').maxAssets) throw new ApiError(422, 'Too many visual assets in this release', 'UI_ASSET_UNAVAILABLE');
  const rows = await UIAsset.find({ _id: { $in: ids }, enabled: true, archived: false }).select('-animation').lean();
  if (rows.length !== ids.length) throw new ApiError(422, 'A referenced animation is missing, disabled or archived', 'UI_ASSET_UNAVAILABLE');
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  for (const page of Object.values(base.pages)) for (const block of [...page.slots.beforeContent, ...page.slots.afterContent]) {
    const imageId = (block.type === 'image' || (block.type === 'homeCard' && block.props.media === 'image')) ? block.props.assetId : block.type === 'heroBanner' ? block.props.imageAssetId : null;
    if (imageId && byId.get(imageId)?.kind !== 'image') throw new ApiError(422, 'Choose an image asset for this section', 'UI_ASSET_UNAVAILABLE');
    if ((block.type === 'lottie' || (block.type === 'homeCard' && block.props.media === 'lottie')) && byId.get(block.props.assetId)?.kind === 'image') throw new ApiError(422, 'Choose a Lottie animation for this section', 'UI_ASSET_UNAVAILABLE');
  }
  return Object.fromEntries(rows.map((row) => [String(row._id), metadata(row)]));
};
const getAsset = async (id) => {
  const asset = await UIAsset.findById(id).lean();
  if (!asset) throw new ApiError(404, 'Animation not found', 'UI_ASSET_NOT_FOUND');
  return asset;
};
const listAssets = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = { archived: false };
  const [data, total] = await Promise.all([UIAsset.find(filter).select('-animation').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), UIAsset.countDocuments(filter)]);
  return paginatedResponse({ data, total, page, limit });
};
const createAsset = async ({ name, mimeType, animation }, actor) => UIAsset.create({ name, mimeType, ...validateAnimation(animation), createdBy: actor });
const createImage = async ({ name, ...input }, actor) => {
  const row = await UIAsset.create({ name, ...require('../validators/uiImage').validateImage(input), createdBy: actor });
  return { ...metadata(row), _id: row._id, name: row.name, enabled: row.enabled, archived: row.archived, assetVersion: row.assetVersion };
};
const getImageContent = async (id) => {
  const row = await UIAsset.findById(id).select('+data').lean();
  if (!row || row.kind !== 'image' || !row.data) throw new ApiError(404, 'Image not found', 'UI_ASSET_NOT_FOUND');
  const stored = row.data;
  row.data = Buffer.isBuffer(stored) ? stored : typeof stored === 'string' ? Buffer.from(stored, 'base64') : Buffer.from(typeof stored.value === 'function' ? stored.value() : stored.buffer || stored);
  if (row.data.length !== row.size || require('node:crypto').createHash('sha256').update(row.data).digest('hex') !== row.sha256) throw new ApiError(503, 'Image is unavailable', 'UI_ASSET_UNAVAILABLE');
  return row;
};
const updateAsset = async (id, { expectedVersion, name, enabled }) => {
  const asset = await UIAsset.findOneAndUpdate({ _id: id, assetVersion: expectedVersion, archived: false }, { $set: { name, enabled }, $inc: { assetVersion: 1 } }, { new: true, runValidators: true });
  if (!asset) throw new ApiError(409, 'Animation changed; reload before retrying', 'UI_ASSET_CONFLICT');
  return asset;
};
const archiveAsset = async (id, { expectedVersion }) => {
  if (await require('../models/UICampaign').exists({ animationAssetId: id })) {
    throw new ApiError(409, 'Animation is referenced by a retained campaign', 'UI_ASSET_IN_USE');
  }
  // Retain anything referenced by ANY draft or historical snapshot, including
  // rollback targets. Immutable bytes are never removed by this API.
  if (await UIRevision.exists({ $or: [{ 'config.slots.beforeContent.props.assetId': id }, { 'config.slots.afterContent.props.assetId': id }, { 'config.slots.beforeContent.props.imageAssetId': id }, { 'config.slots.afterContent.props.imageAssetId': id }] })) {
    throw new ApiError(409, 'Animation is referenced by a draft or retained release', 'UI_ASSET_IN_USE');
  }
  const asset = await UIAsset.findOneAndUpdate({ _id: id, assetVersion: expectedVersion, archived: false }, { $set: { archived: true, enabled: false }, $inc: { assetVersion: 1 } }, { new: true, runValidators: true });
  if (!asset) throw new ApiError(409, 'Animation changed; reload before retrying', 'UI_ASSET_CONFLICT');
  return asset;
};
module.exports = { assetIds, metadata, resolveAssets, getAsset, listAssets, createAsset, createImage, getImageContent, updateAsset, archiveAsset };
