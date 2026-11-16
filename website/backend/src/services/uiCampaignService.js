const Joi = require('joi');
const UICampaign = require('../models/UICampaign');
const City = require('../models/City');
const ApiError = require('../utils/ApiError');
const { getRelease } = require('./uiConfigService');
const { loadBase } = require('./uiRuntimeService');
const { resolveAssets } = require('./uiAssetService');
const { status, applyAnimation } = require('./uiCampaignRuntime');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const id = Joi.string().pattern(/^[a-fA-F0-9]{24}$/);
const instant = Joi.string().isoDate().pattern(/(?:Z|[+-]\d{2}:\d{2})$/).required();
const schema = Joi.object({
  identifier: Joi.string().pattern(/^[a-z0-9][a-z0-9-]{2,79}$/).required(),
  name: Joi.string().trim().min(1).max(120).pattern(/^[^<>\x00-\x1f]+$/).required(),
  festival: Joi.string().valid('diwali', 'holi', 'christmas', 'new-year', 'custom').default('custom'),
  releaseId: id.required(), animationAssetId: id.allow(null).default(null),
  startsAt: instant, endsAt: instant, timezone: Joi.string().valid('Asia/Kolkata').default('Asia/Kolkata'),
  cityIds: Joi.array().items(id).unique().max(100).default([]), priority: Joi.number().integer().min(0).max(1000).default(0),
  state: Joi.string().valid('draft', 'scheduled', 'disabled').default('draft'), enabled: Joi.boolean().default(true),
  reason: Joi.string().trim().min(3).max(500).required(), expectedVersion: Joi.number().integer().min(1),
}).options({ abortEarly: false, convert: false, allowUnknown: false });
const invalid = (message) => new ApiError(422, message, 'UI_CAMPAIGN_INVALID');
const validate = (body) => {
  const { error, value } = schema.validate(body);
  if (error) throw invalid(error.details.map((item) => item.message).join('; '));
  if (+new Date(value.endsAt) <= +new Date(value.startsAt)) throw invalid('End must be after start');
  value.releaseId = value.releaseId.toLowerCase();
  if (value.animationAssetId) value.animationAssetId = value.animationAssetId.toLowerCase();
  value.cityIds = value.cityIds.map((id) => id.toLowerCase());
  if (new Set(value.cityIds).size !== value.cityIds.length) throw invalid('Select unique city IDs');
  return value;
};
const get = async (id) => {
  const row = await UICampaign.findById(id).lean();
  if (!row) throw new ApiError(404, 'Campaign not found', 'UI_CAMPAIGN_NOT_FOUND');
  return row;
};
const inspect = async (input, excludeId) => {
  const release = await getRelease(input.releaseId); // rejects uncommitted/orphan snapshots
  const base = applyAnimation(await loadBase(release), input);
  const assets = await resolveAssets(base);
  if (input.cityIds.length) {
    const cities = await City.find({ _id: { $in: input.cityIds }, isActive: true }).lean();
    if (cities.length !== input.cityIds.length) throw invalid('Select supported active cities');
  }
  const overlaps = await UICampaign.find({ state: 'scheduled', enabled: true, startsAt: { $lt: new Date(input.endsAt) }, endsAt: { $gt: new Date(input.startsAt) } }).select('name priority cityIds').lean();
  const conflicts = overlaps.filter((row) => String(row._id) !== String(excludeId) && (!input.cityIds.length || !row.cityIds.length || input.cityIds.some((id) => row.cityIds.map(String).includes(id))));
  return { base, assets, conflicts: conflicts.map((row) => ({ id: String(row._id), name: row.name, priority: row.priority })) };
};
const preview = async (body, excludeId) => { const input = validate(body); return inspect(input, excludeId); };
const save = async (id, body, actor) => {
  const input = validate(body);
  const previous = id ? await get(id) : null;
  if (previous && previous.version !== input.expectedVersion) throw new ApiError(409, 'Campaign changed; reload before retrying', 'UI_CAMPAIGN_CONFLICT');
  if (!previous && input.expectedVersion) throw invalid('New campaigns cannot specify expectedVersion');
  // Administrators must be able to stop a retained campaign even if one of its
  // referenced assets/cities was disabled after scheduling.
  const deactivating = previous && (!input.enabled || input.state !== 'scheduled')
    && input.releaseId === String(previous.releaseId)
    && String(input.animationAssetId) === String(previous.animationAssetId)
    && JSON.stringify(input.cityIds) === JSON.stringify(previous.cityIds.map(String));
  const { conflicts } = deactivating ? { conflicts: [] } : await inspect(input, id);
  if (input.state === 'scheduled' && input.enabled) {
    if (+new Date(input.endsAt) <= Date.now()) throw invalid('Cannot schedule an expired campaign');
    if (conflicts.some((row) => row.priority === input.priority)) throw new ApiError(409, 'Overlapping campaigns must have different priorities', 'UI_CAMPAIGN_OVERLAP');
  }
  const { reason, expectedVersion, ...fields } = input;
  const version = (previous?.version || 0) + 1;
  const entry = { actor, at: new Date(), reason, version, changes: fields };
  try {
    const row = previous ? await UICampaign.findOneAndUpdate({ _id: id, version: expectedVersion },
      { $set: { ...fields, updatedBy: actor }, $inc: { version: 1 }, $push: { audit: entry } }, { new: true, runValidators: true })
      : await UICampaign.create({ ...fields, version, createdBy: actor, updatedBy: actor, audit: [entry] });
    if (!row) throw new ApiError(409, 'Campaign changed; reload before retrying', 'UI_CAMPAIGN_CONFLICT');
    const value = row.toObject ? row.toObject() : row;
    return { ...value, status: status(value) };
  } catch (error) { if (error.code === 11000) throw new ApiError(409, 'Campaign identifier already exists', 'UI_CAMPAIGN_DUPLICATE'); throw error; }
};
const list = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const [rows, total] = await Promise.all([UICampaign.find({}).select('-audit').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(), UICampaign.countDocuments({})]);
  return paginatedResponse({ data: rows.map((row) => ({ ...row, status: status(row) })), total, page, limit });
};
module.exports = { validate, inspect, preview, save, list, get };
