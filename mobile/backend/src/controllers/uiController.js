const { createHash } = require('node:crypto');
const asyncHandler = require('../utils/asyncHandler');
const { getRuntime } = require('../services/uiRuntimeService');

const runtime = asyncHandler(async (req, res) => {
  const config = await getRuntime(req.query);
  const { serverTime, refreshAfter, validUntil, ...content } = config;
  const etag = `W/"${createHash('sha256').update(JSON.stringify(content)).digest('hex')}"`;
  res.set('ETag', etag);
  res.set('Cache-Control', 'public, max-age=0, must-revalidate, stale-if-error=0');
  if (req.fresh) return res.status(304).end();
  return res.json(config);
});

const asset = asyncHandler(async (req, res) => {
  const runtime = await getRuntime({ rendererVersion: req.query.rendererVersion || 2, cityId: req.query.cityId, campaignVersion: req.query.campaignVersion });
  if (!runtime.enabled || !runtime.assets[req.params.id]) throw new (require('../utils/ApiError'))(404, 'Published animation not found', 'UI_ASSET_NOT_FOUND');
  const row = await require('../services/uiAssetService').getAsset(req.params.id);
  if (!row.enabled || row.archived || row.sha256 !== runtime.assets[req.params.id].sha256) throw new (require('../utils/ApiError'))(404, 'Published animation not found', 'UI_ASSET_NOT_FOUND');
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.set('ETag', `W/"${row.sha256}"`);
  if (req.fresh) return res.status(304).end();
  if (row.kind === 'image') {
    const image = await require('../services/uiAssetService').getImageContent(req.params.id);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.type(image.mimeType).send(Buffer.from(image.data));
  }
  return res.json({ success: true, asset: { ...runtime.assets[req.params.id], animation: row.animation } });
});
module.exports = { runtime, asset };
