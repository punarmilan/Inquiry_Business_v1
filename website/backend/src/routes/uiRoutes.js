const express = require('express');
const { requireAdminAuth } = require('../middleware/auth');
const controller = require('../controllers/uiController');
const schemas = require('../validators/ui.validator');

const router = express.Router();
router.use(requireAdminAuth);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const asyncHandler = require('../utils/asyncHandler');
const campaigns = require('../services/uiCampaignService');
router.get('/campaigns', schemas.validate(schemas.listReleases), asyncHandler(async (req, res) => res.json({ success: true, ...(await campaigns.list(req.query)) })));
router.post('/campaigns/preview', asyncHandler(async (req, res) => res.json({ success: true, ...(await campaigns.preview(req.body)) })));
router.post('/campaigns', asyncHandler(async (req, res) => res.status(201).json({ success: true, campaign: await campaigns.save(null, req.body, req.admin._id) })));
router.get('/campaigns/:id', schemas.validate(schemas.getById), asyncHandler(async (req, res) => { const row = await campaigns.get(req.params.id); res.json({ success: true, campaign: { ...row, status: require('../services/uiCampaignRuntime').status(row) } }); }));
router.put('/campaigns/:id', asyncHandler(async (req, res) => {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) throw new (require('../utils/ApiError'))(422, 'Invalid campaign ID', 'UI_CAMPAIGN_INVALID');
  res.json({ success: true, campaign: await campaigns.save(req.params.id, req.body, req.admin._id) });
}));
router.get('/assets', schemas.validate(schemas.listAssets), controller.listAssets);
router.post('/assets', schemas.validate(schemas.assetCreate), controller.createAsset);
router.post('/assets/image', schemas.validate(schemas.imageCreate), controller.createImage);
router.get('/assets/:id/content', schemas.validate(schemas.getById), controller.imageContent);
router.get('/assets/:id', schemas.validate(schemas.getById), controller.getAsset);
router.put('/assets/:id', schemas.validate(schemas.assetUpdate), controller.updateAsset);
router.post('/assets/:id/archive', schemas.validate(schemas.assetArchive), controller.archiveAsset);
router.get('/configs', schemas.validate(schemas.listConfigs), controller.listConfigs);
router.post('/configs/validate', schemas.validate(schemas.validateInput), controller.validateInput);
router.post('/configs', schemas.validate(schemas.createDraft), controller.createDraft);
router.get('/configs/:id', schemas.validate(schemas.getById), controller.getConfig);
router.put('/configs/:id', schemas.validate(schemas.updateDraft), controller.updateDraft);
router.post('/configs/:id/validate', schemas.validate(schemas.validateDraft), controller.validateDraft);
router.post('/configs/:id/publish', schemas.validate(schemas.publish), controller.publish);
router.get('/releases', schemas.validate(schemas.listReleases), controller.listReleases);
router.get('/releases/:id', schemas.validate(schemas.getById), controller.getRelease);
router.post('/releases/:id/rollback', schemas.validate(schemas.rollback), controller.rollback);

module.exports = router;
