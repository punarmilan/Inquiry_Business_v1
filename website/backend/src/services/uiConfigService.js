const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const UIRevision = require('../models/UIRevision');
const UIRelease = require('../models/UIRelease');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { HEAD_KEY, SCHEMA_VERSION, RENDERER_VERSION, validateConfig, checkBase, defaultBase } = require('../validators/ui.validator');
const { readHead, loadRelease, loadBase } = require('./uiRuntimeService');

const conflict = () => new ApiError(409, 'UI configuration changed; reload before retrying', 'UI_VERSION_CONFLICT');
const getConfig = async (id) => {
  const revision = await UIRevision.findById(id).lean();
  if (!revision) throw new ApiError(404, 'UI configuration not found', 'UI_CONFIG_NOT_FOUND');
  return revision;
};
const getDraft = async (id, expectedDraftVersion) => {
  const revision = await getConfig(id);
  if (revision.status !== 'draft') throw new ApiError(409, 'Published configurations are read-only; create a new draft', 'UI_REVISION_IMMUTABLE');
  if (revision.draftVersion !== expectedDraftVersion) throw conflict();
  return revision;
};
const createDraft = async ({ config: input, sourceRevisionId }, actor) => {
  const config = validateConfig(input);
  if (sourceRevisionId) {
    const source = await getConfig(sourceRevisionId);
    if (source.kind !== config.kind || source.key !== config.key) throw new ApiError(422, 'Draft source identity mismatch', 'UI_CONFIG_INVALID');
  }
  return UIRevision.create({ kind: config.kind, key: config.key, status: 'draft', draftVersion: 1,
    config, sourceRevisionId: sourceRevisionId || null, createdBy: actor, updatedBy: actor });
};
const updateDraft = async (id, { config: input, expectedDraftVersion }, actor) => {
  const config = validateConfig(input);
  const draft = await getDraft(id, expectedDraftVersion);
  if (draft.kind !== config.kind || draft.key !== config.key) throw new ApiError(422, 'Draft kind and key cannot change', 'UI_CONFIG_INVALID');
  const updated = await UIRevision.findOneAndUpdate({ _id: id, status: 'draft', draftVersion: expectedDraftVersion },
    { $set: { config, updatedBy: actor }, $inc: { draftVersion: 1 } }, { new: true });
  if (!updated) throw conflict();
  return updated;
};
const listConfigs = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.kind) filter.kind = query.kind;
  if (query.status) filter.status = query.status;
  const [data, total] = await Promise.all([
    UIRevision.find(filter).select('-config -__v').sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    UIRevision.countDocuments(filter),
  ]);
  return paginatedResponse({ data, total, page, limit });
};
const validateDraft = async (id, expectedDraftVersion) => {
  const draft = await getDraft(id, expectedDraftVersion);
  validateConfig(draft.config);
  const head = await readHead();
  // Validate compatibility with the currently published theme/pages without writing a snapshot.
  const release = await loadRelease(head);
  const base = release ? await loadBase(release) : defaultBase();
  if (draft.kind === 'theme') base.theme = draft.config;
  else base.pages[draft.key] = draft.config;
  checkBase(base);
  await require('./uiAssetService').resolveAssets(base);
  return { valid: true, schemaVersion: SCHEMA_VERSION, rendererVersion: RENDERER_VERSION, draftVersion: draft.draftVersion, generation: head.generation };
};
const assertGeneration = (head, expected) => { if (head.generation !== expected) throw conflict(); };
const activate = async (release, head, actor) => {
  // This is the only live-state mutation. All immutable referenced records already exist.
  const value = { releaseId: String(release._id), generation: release.generation, enabled: head.enabled };
  if (!head.exists) {
    try { await Setting.create({ key: HEAD_KEY, type: 'json', value, updatedBy: actor }); }
    catch (error) { if (error.code === 11000) throw conflict(); throw error; }
  } else {
    const updated = await Setting.findOneAndUpdate({ key: HEAD_KEY, 'value.generation': head.generation, 'value.releaseId': head.releaseId },
      { $set: { type: 'json', value, updatedBy: actor } }, { new: true, runValidators: true });
    if (!updated) throw conflict();
  }
  return { releaseId: String(release._id), generation: release.generation, release };
};
const publish = async (id, { expectedDraftVersion, expectedGeneration, reason }, actor) => {
  const draft = await getDraft(id, expectedDraftVersion);
  const config = validateConfig(draft.config);
  const head = await readHead();
  assertGeneration(head, expectedGeneration);
  const previous = await loadRelease(head);
  const revision = await UIRevision.create({ kind: config.kind, key: config.key, status: 'published', config,
    draftVersion: draft.draftVersion, sourceRevisionId: draft._id, createdBy: actor, updatedBy: actor, publishedAt: new Date() });
  const candidate = {
    schemaVersion: SCHEMA_VERSION, rendererVersion: RENDERER_VERSION, generation: head.generation + 1,
    pageRevisionIds: { ...(previous?.pageRevisionIds || {}) }, themeRevisionId: previous?.themeRevisionId || null,
    previousReleaseId: head.releaseId, actor, reason,
  };
  if (config.kind === 'page') candidate.pageRevisionIds[config.key] = String(revision._id);
  else candidate.themeRevisionId = revision._id;
  await loadBase(candidate);
  const release = await UIRelease.create(candidate);
  return activate(release, head, actor);
};

// Only releases reachable from the active head are history. CAS losers/orphan candidates
// must never become visible as successfully published releases or rollback targets.
const historyPipeline = (head) => [
  { $match: { _id: new mongoose.Types.ObjectId(head.releaseId) } },
  { $graphLookup: { from: UIRelease.collection.name, startWith: '$previousReleaseId', connectFromField: 'previousReleaseId', connectToField: '_id', as: 'ancestors' } },
  { $project: { releases: { $concatArrays: [['$$ROOT'], '$ancestors'] } } },
  { $unwind: '$releases' }, { $replaceRoot: { newRoot: '$releases' } },
];
const getPublishedRelease = async (id, head) => {
  if (!head.exists) throw new ApiError(404, 'Published UI release not found', 'UI_RELEASE_NOT_FOUND');
  const [release] = await UIRelease.aggregate([...historyPipeline(head), { $match: { _id: new mongoose.Types.ObjectId(id) } }, { $project: { ancestors: 0, __v: 0 } }]);
  if (!release) throw new ApiError(404, 'Published UI release not found', 'UI_RELEASE_NOT_FOUND');
  return release;
};
const getRelease = async (id) => getPublishedRelease(id, await readHead());
const listReleases = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const head = await readHead();
  if (!head.exists) return paginatedResponse({ data: [], total: 0, page, limit });
  const [result] = await UIRelease.aggregate([...historyPipeline(head), { $sort: { generation: -1 } },
    { $facet: { data: [{ $skip: skip }, { $limit: limit }, { $project: { ancestors: 0, __v: 0 } }], meta: [{ $count: 'total' }] } }]);
  return paginatedResponse({ data: result?.data || [], total: result?.meta[0]?.total || 0, page, limit });
};
const rollback = async (id, { expectedGeneration, reason }, actor) => {
  const head = await readHead();
  assertGeneration(head, expectedGeneration);
  const target = await getPublishedRelease(id, head);
  await loadBase(target);
  const release = await UIRelease.create({ schemaVersion: SCHEMA_VERSION, rendererVersion: RENDERER_VERSION,
    generation: head.generation + 1, pageRevisionIds: target.pageRevisionIds, themeRevisionId: target.themeRevisionId,
    previousReleaseId: head.releaseId, rolledBackFrom: target._id, actor, reason });
  return activate(release, head, actor);
};

module.exports = { createDraft, updateDraft, getConfig, listConfigs, validateDraft, publish, getRelease, listReleases, rollback };
