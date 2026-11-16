// Mirrored in the app API to preserve deployment boundaries without a shared build system.
const Setting = require('../models/Setting');
const UIRelease = require('../models/UIRelease');
const UIRevision = require('../models/UIRevision');
const ApiError = require('../utils/ApiError');
const { resolveAssets } = require('./uiAssetService');
const campaigns = require('./uiCampaignRuntime');
const { HEAD_KEY, SCHEMA_VERSION, RENDERER_VERSION, buildBase, defaultBase } = require('../validators/ui.validator');

const readHead = async () => {
  const setting = await Setting.findOne({ key: HEAD_KEY }).lean();
  if (!setting) return { exists: false, releaseId: null, generation: 0, enabled: true };
  const head = setting.value;
  if (!head || !/^[a-fA-F0-9]{24}$/.test(head.releaseId) || !Number.isSafeInteger(head.generation)
    || head.generation < 1 || typeof head.enabled !== 'boolean') {
    throw new ApiError(503, 'Invalid published UI reference', 'UI_RELEASE_INVALID');
  }
  return { exists: true, releaseId: head.releaseId, generation: head.generation, enabled: head.enabled };
};
const loadSnapshot = async (release) => {
  const ids = [...Object.values(release.pageRevisionIds || {}), ...(release.themeRevisionId ? [release.themeRevisionId] : [])];
  const revisions = ids.length ? await UIRevision.find({ _id: { $in: ids }, status: 'published' }).lean() : [];
  const base = buildBase(release, revisions);
  return { base, assets: await resolveAssets(base) };
};
const loadBase = async (release) => (await loadSnapshot(release)).base;
const loadRelease = async (head) => {
  if (!head.exists) return null;
  const release = await UIRelease.findById(head.releaseId).lean();
  if (!release || release.generation !== head.generation) throw new ApiError(503, 'Published UI release is unavailable', 'UI_RELEASE_INVALID');
  return release;
};
const getRuntime = async ({ rendererVersion = RENDERER_VERSION, cityId, campaignVersion } = {}, clock = Date.now) => {
  const now = new Date(clock());
  let head = { releaseId: null, generation: 0 };
  let base = defaultBase();
  let fallbackReason = 'not_published';
  let assets = {};
  let requiredRenderer = 1;
  let campaign = null;
  let nextTransitionAt = null;
  try {
    head = await readHead();
    if (![1, 2, 3, 4, 5, RENDERER_VERSION].includes(rendererVersion)) fallbackReason = 'unsupported_renderer';
    else if (!head.enabled) fallbackReason = 'disabled';
    else if (head.exists) {
      const snapshot = await loadSnapshot(await loadRelease(head));
      base = snapshot.base;
      requiredRenderer = Math.max(...Object.values(base.pages).map((page) => page.rendererVersion));
      if (rendererVersion < requiredRenderer) { base = defaultBase(); requiredRenderer = 1; fallbackReason = 'unsupported_renderer'; }
      else { assets = snapshot.assets; fallbackReason = null; }
      if (fallbackReason === null && campaignVersion === 1) {
        const schedule = await campaigns.readSchedule(+now);
        let eligibleCity = cityId;
        if (cityId && schedule.some((row) => row.cityIds.length)) {
          const city = await require('../models/City').findOne({ _id: cityId, isActive: true }).lean();
          if (!city) eligibleCity = undefined;
        }
        const selection = campaigns.resolve(schedule, eligibleCity, +now);
        nextTransitionAt = selection.nextTransitionAt;
        if (selection.winner) {
          try {
            const selected = selection.winner;
            const release = await UIRelease.findById(selected.releaseId).lean();
            if (!release) throw new Error('Missing campaign release');
            const selectedSnapshot = await loadSnapshot(release);
            const candidate = campaigns.applyAnimation(selectedSnapshot.base, selected);
            const required = Math.max(...Object.values(candidate.pages).map((page) => page.rendererVersion));
            if (required <= rendererVersion) {
              const selectedAssets = selected.animationAssetId ? await resolveAssets(candidate) : selectedSnapshot.assets;
              base = candidate; assets = selectedAssets; requiredRenderer = required;
              campaign = { id: String(selected._id), identifier: selected.identifier, version: selected.version,
                releaseId: String(selected.releaseId), startsAt: new Date(selected.startsAt).toISOString(), endsAt: new Date(selected.endsAt).toISOString() };
            }
          } catch (_error) { /* Restore the validated published default when a campaign is unavailable. */ }
        }
      }
    }
  } catch (_error) {
    base = defaultBase();
    assets = {}; requiredRenderer = 1;
    fallbackReason = 'unavailable'; campaign = null;
  }
  return { success: true, releaseId: head.releaseId, generation: head.generation, schemaVersion: SCHEMA_VERSION,
    rendererVersion: requiredRenderer, enabled: fallbackReason === null, useNativeFallback: fallbackReason !== null,
    fallbackReason, serverTime: now.toISOString(), refreshAfter: new Date(Math.min(+now + 60_000, nextTransitionAt ? Date.parse(nextTransitionAt) : Infinity)).toISOString(),
    validUntil: new Date(Math.min(+now + 7 * 86400_000, nextTransitionAt ? Date.parse(nextTransitionAt) : Infinity)).toISOString(),
    ...(campaignVersion === 1 ? { campaign, nextTransitionAt } : {}), base, overlay: null, assets };
};

module.exports = { readHead, loadBase, loadRelease, getRuntime };
