const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/uiConfigService');
const { validateConfig, SCHEMA_VERSION, RENDERER_VERSION } = require('../validators/ui.validator');
const assets = require('../services/uiAssetService');
const listAssets = asyncHandler(async (req, res) => res.json({ success: true, ...(await assets.listAssets(req.query)) }));
const createAsset = asyncHandler(async (req, res) => res.status(201).json({ success: true, asset: await assets.createAsset(req.body, req.admin._id) }));
const createImage = asyncHandler(async (req, res) => res.status(201).json({ success: true, asset: await assets.createImage(req.body, req.admin._id) }));
const imageContent = asyncHandler(async (req, res) => {
  const row = await assets.getImageContent(req.params.id);
  res.set('X-Content-Type-Options', 'nosniff');
  res.type(row.mimeType).send(Buffer.from(row.data));
});
const getAsset = asyncHandler(async (req, res) => res.json({ success: true, asset: await assets.getAsset(req.params.id) }));
const updateAsset = asyncHandler(async (req, res) => res.json({ success: true, asset: await assets.updateAsset(req.params.id, req.body) }));
const archiveAsset = asyncHandler(async (req, res) => res.json({ success: true, asset: await assets.archiveAsset(req.params.id, req.body) }));

const listConfigs = asyncHandler(async (req, res) => res.json({ success: true, ...(await service.listConfigs(req.query)) }));
const getConfig = asyncHandler(async (req, res) => res.json({ success: true, config: await service.getConfig(req.params.id) }));
const createDraft = asyncHandler(async (req, res) => res.status(201).json({ success: true, config: await service.createDraft(req.body, req.admin._id) }));
const updateDraft = asyncHandler(async (req, res) => res.json({ success: true, config: await service.updateDraft(req.params.id, req.body, req.admin._id) }));
const validateInput = asyncHandler(async (req, res) => {
  const config = validateConfig(req.body.config);
  res.json({ success: true, valid: true, schemaVersion: SCHEMA_VERSION, rendererVersion: RENDERER_VERSION, config });
});
const validateDraft = asyncHandler(async (req, res) => res.json({ success: true, ...(await service.validateDraft(req.params.id, req.body.expectedDraftVersion)) }));
const publish = asyncHandler(async (req, res) => res.status(201).json({ success: true, ...(await service.publish(req.params.id, req.body, req.admin._id)) }));
const listReleases = asyncHandler(async (req, res) => res.json({ success: true, ...(await service.listReleases(req.query)) }));
const getRelease = asyncHandler(async (req, res) => res.json({ success: true, release: await service.getRelease(req.params.id) }));
const rollback = asyncHandler(async (req, res) => res.status(201).json({ success: true, ...(await service.rollback(req.params.id, req.body, req.admin._id)) }));

module.exports = { listConfigs, getConfig, createDraft, updateDraft, validateInput, validateDraft, publish, listReleases, getRelease, rollback,
  listAssets, createAsset, createImage, imageContent, getAsset, updateAsset, archiveAsset };
