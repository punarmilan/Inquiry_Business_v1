const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { installStore, serve } = require('./ui-store.helper');
const config = require('../src/services/uiConfigService');
const service = require('../src/services/uiCampaignService');
const actualRuntime = require('../../../mobile/backend/src/services/uiRuntimeService');
const runtime = { getRuntime: (query, clock) => actualRuntime.getRuntime({ ...query, campaignVersion: 1 }, clock) };
const resolver = require('../src/services/uiCampaignRuntime');
const root = path.resolve(__dirname, '..'), mobile = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011', CITY = '507f1f77bcf86cd799439012', OTHER = '507f1f77bcf86cd799439013';
const NOW = Date.parse('2030-10-20T18:00:00.000Z');
const page = (title) => ({ schemaVersion: 1, rendererVersion: 1, kind: 'page', key: 'offersHome', slots: { beforeContent: [{ id: 'intro', type: 'heroBanner', props: { title: { en: title } } }], afterContent: [] } });
const title = (result) => result.base.pages.offersHome.slots.beforeContent[0].props.title.en;
async function setup(t) {
  const state = installStore(t, [root, mobile]);
  let generation = 0;
  const publish = async (text) => {
    const draft = await config.createDraft({ config: page(text) }, ACTOR);
    return config.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: text }, ACTOR);
  };
  await publish('Initial default');
  const festival = await publish('Festival banner');
  const baseline = await publish('Current default');
  t.mock.method(Date, 'now', () => NOW);
  const input = { identifier: 'diwali-local', name: 'Diwali local', festival: 'diwali', releaseId: festival.releaseId, animationAssetId: null,
    startsAt: new Date(NOW + 60_000).toISOString(), endsAt: new Date(NOW + 120_000).toISOString(), timezone: 'Asia/Kolkata', cityIds: [], priority: 10, state: 'scheduled', enabled: true, reason: 'Schedule festival' };
  return { state, input, baseline, festival };
}

test('start inclusive/end exclusive scheduling, expiry, current default and generation identity', async (t) => {
  const { input, baseline, state } = await setup(t);
  const campaign = await service.save(null, input, ACTOR);
  assert.equal(campaign.status, 'scheduled');
  const before = await runtime.getRuntime({}, () => NOW);
  assert.equal(title(before), 'Current default');
  assert.equal(before.validUntil, input.startsAt);
  assert.equal(before.nextTransitionAt, input.startsAt);
  const active = await runtime.getRuntime({}, () => NOW + 60_000);
  assert.equal(title(active), 'Festival banner');
  assert.equal(active.campaign.id, campaign._id);
  assert.equal(active.releaseId, baseline.releaseId);
  assert.equal(active.generation, 3);
  assert.equal(active.validUntil, input.endsAt);
  assert.equal(title(await runtime.getRuntime({}, () => NOW + 120_000)), 'Current default');
  assert.equal(state.head().generation, 3);
  assert.equal(resolver.status(campaign, NOW + 120_000), 'expired');
  const legacy = await actualRuntime.getRuntime({}, () => NOW + 60_000);
  assert.equal(title(legacy), 'Current default');
  assert.equal(Object.hasOwn(legacy, 'campaign'), false);
  assert.equal(Object.hasOwn(legacy, 'nextTransitionAt'), false);
});

test('priority overlaps and deterministic ties recover lower campaign after a higher campaign expires', async (t) => {
  const { input, state } = await setup(t);
  const low = await service.save(null, input, ACTOR);
  await assert.rejects(service.save(null, { ...input, identifier: 'same-priority' }, ACTOR), { code: 'UI_CAMPAIGN_OVERLAP' });
  const high = await service.save(null, { ...input, identifier: 'high-priority', priority: 20, endsAt: new Date(NOW + 90_000).toISOString() }, ACTOR);
  assert.equal((await runtime.getRuntime({}, () => NOW + 60_000)).campaign.id, high._id);
  assert.equal((await runtime.getRuntime({}, () => NOW + 90_000)).campaign.id, low._id);
  const tied = { ...high, identifier: 'aaa-tie', _id: OTHER };
  state.campaigns.set(OTHER, tied);
  assert.equal(resolver.resolve([high, tied], null, NOW + 60_000).winner.identifier, 'aaa-tie');
  assert.equal(resolver.resolve([tied, high], null, NOW + 60_000).winner.identifier, 'aaa-tie');
});

test('explicit offset dates cross IST midnight correctly; timestamps without timezone and invalid windows reject', async (t) => {
  const { input } = await setup(t);
  const campaign = await service.save(null, { ...input, startsAt: '2030-10-21T00:00:00+05:30', endsAt: '2030-10-21T01:00:00+05:30' }, ACTOR);
  assert.equal(new Date(campaign.startsAt).toISOString(), '2030-10-20T18:30:00.000Z');
  assert.equal((await runtime.getRuntime({}, () => Date.parse('2030-10-20T18:29:59Z'))).campaign, null);
  assert.ok((await runtime.getRuntime({}, () => Date.parse('2030-10-20T18:30:00Z'))).campaign);
  for (const body of [{ startsAt: '2030-10-21T00:00:00' }, { endsAt: input.startsAt }, { timezone: 'Europe/London' }, { startsAt: 'bad' }]) assert.throws(() => service.validate({ ...input, ...body }), { code: 'UI_CAMPAIGN_INVALID' });
});

test('selected supported cities are eligible, unknown/missing cities receive default, global campaigns apply everywhere', async (t) => {
  const { input, state } = await setup(t);
  state.cities.set(CITY, { _id: CITY, isActive: true });
  const campaign = await service.save(null, { ...input, cityIds: [CITY] }, ACTOR);
  assert.equal((await runtime.getRuntime({ cityId: CITY }, () => NOW + 60_000)).campaign.id, campaign._id);
  for (const cityId of [OTHER, undefined]) assert.equal((await runtime.getRuntime({ cityId }, () => NOW + 60_000)).campaign, null);
  await assert.rejects(service.save(null, { ...input, cityIds: [OTHER] }, ACTOR), { code: 'UI_CAMPAIGN_INVALID' });
  assert.equal(resolver.eligible({ cityIds: [] }, undefined), true);
  state.cities.get(CITY).isActive = false;
  assert.equal((await runtime.getRuntime({ cityId: CITY }, () => NOW + 60_000)).campaign, null);
});

test('invalid, unsafe, missing, uncommitted releases and unsupported assets never schedule', async (t) => {
  const { input, state } = await setup(t);
  for (const body of [{ priority: 1001 }, { state: 'active' }, { enabled: 'true' }, { name: '<script>' }, { roles: ['admin'] }, { cityIds: [CITY, CITY] }, { identifier: 'BAD ID' }]) assert.throws(() => service.validate({ ...input, ...body }), { code: 'UI_CAMPAIGN_INVALID' });
  await assert.rejects(service.save(null, { ...input, releaseId: OTHER }, ACTOR), { code: 'UI_RELEASE_NOT_FOUND' });
  state.releases.set(OTHER, { ...state.releases.get(input.releaseId), _id: OTHER });
  await assert.rejects(service.save(null, { ...input, releaseId: OTHER }, ACTOR), { code: 'UI_RELEASE_NOT_FOUND' });
  await assert.rejects(service.save(null, { ...input, animationAssetId: OTHER }, ACTOR), { code: 'UI_ASSET_UNAVAILABLE' });
  assert.equal(state.campaigns.size, 0);
});

test('CAS updates, audit, disable/cancel and invalid references retain administrative control', async (t) => {
  const { input, state } = await setup(t);
  const row = await service.save(null, input, ACTOR);
  const updated = await service.save(row._id, { ...input, expectedVersion: 1, priority: 30, reason: 'Raise priority' }, ACTOR);
  assert.equal(updated.version, 2); assert.equal(updated.audit.length, 2);
  assert.equal(updated.audit[1].changes.priority, 30);
  await assert.rejects(service.save(row._id, { ...input, expectedVersion: 1 }, ACTOR), { code: 'UI_CAMPAIGN_CONFLICT' });
  state.revisions.clear(); // Stop remains possible when the referenced release is damaged.
  const disabled = await service.save(row._id, { ...input, expectedVersion: 2, state: 'disabled', enabled: false, reason: 'Disable festival' }, ACTOR);
  assert.equal(disabled.status, 'disabled');
  const cancelled = await service.save(row._id, { ...input, expectedVersion: 3, state: 'draft', reason: 'Cancel schedule' }, ACTOR);
  assert.equal(cancelled.status, 'draft'); assert.equal(cancelled.audit.length, 4);
});

test('fresh service instances recover missed start/end boundaries without a scheduler or writes', async (t) => {
  const { input, state } = await setup(t);
  await service.save(null, input, ACTOR);
  const file = require.resolve('../../../mobile/backend/src/services/uiRuntimeService');
  delete require.cache[file];
  const restarted = require(file);
  assert.ok((await restarted.getRuntime({ campaignVersion: 1 }, () => NOW + 80_000)).campaign);
  assert.equal((await restarted.getRuntime({ campaignVersion: 1 }, () => NOW + 200_000)).campaign, null);
  assert.equal(state.head().generation, 3);
  for (const file of ['models/UICampaign.js', 'services/uiCampaignRuntime.js', 'services/uiRuntimeService.js']) assert.equal(fs.readFileSync(path.join(root, 'src', file), 'utf8'), fs.readFileSync(path.join(mobile, 'src', file), 'utf8'));
});

test('actual public API revalidates boundaries with ETags; admin routes enforce active-admin authentication', async (t) => {
  const { input } = await setup(t);
  let time = NOW;
  t.mock.method(Date, 'now', () => time);
  const app = await serve(t, require('../../../mobile/backend/src/app'));
  const admin = await serve(t, require('../src/app'));
  for (const [method, url] of [['GET', '/ui/campaigns'], ['POST', '/ui/campaigns'], ['POST', '/ui/campaigns/preview'], ['GET', `/ui/campaigns/${ACTOR}`], ['PUT', `/ui/campaigns/${ACTOR}`]]) assert.equal((await admin(method, url, method === 'GET' ? undefined : {})).status, 401);
  const AdminUser = require('../src/models/AdminUser');
  t.mock.method(AdminUser, 'findById', async () => ({ _id: ACTOR, isActive: true }));
  const token = require('jsonwebtoken').sign({ sub: ACTOR, type: 'access' }, require('../src/config/env').jwtAccessSecret, { expiresIn: '5m' });
  const auth = { Authorization: `Bearer ${token}` };
  const created = await admin('POST', '/ui/campaigns', input, auth);
  assert.equal(created.status, 201); assert.equal(created.headers['cache-control'], 'no-store');
  assert.equal((await admin('POST', '/ui/campaigns/preview', input, auth)).status, 200);
  assert.equal((await admin('GET', '/ui/campaigns', undefined, auth)).body.data[0].status, 'scheduled');
  const before = await app('GET', '/ui/runtime?campaignVersion=1');
  assert.equal((await app('GET', '/ui/runtime?campaignVersion=1', undefined, { 'If-None-Match': before.headers.etag })).status, 304);
  time += 60_000;
  const active = await app('GET', '/ui/runtime?campaignVersion=1', undefined, { 'If-None-Match': before.headers.etag });
  assert.equal(active.status, 200); assert.ok(active.body.campaign); assert.notEqual(active.headers.etag, before.headers.etag);
  assert.match(active.headers['cache-control'], /must-revalidate/);
  time += 60_000;
  const expired = await app('GET', '/ui/runtime?campaignVersion=1', undefined, { 'If-None-Match': active.headers.etag });
  assert.equal(expired.status, 200); assert.equal(expired.body.campaign, null); assert.equal(title(expired.body), 'Current default');
  t.mock.method(AdminUser, 'findById', async () => ({ _id: ACTOR, isActive: false }));
  assert.equal((await admin('GET', '/ui/campaigns', undefined, auth)).status, 401);
});

test('campaign animation uses supported renderer and city-scoped public reference checks', async (t) => {
  const { input, state } = await setup(t);
  state.cities.set(CITY, { _id: CITY, isActive: true });
  const assets = require('../src/services/uiAssetService');
  const asset = await assets.createAsset({ name: 'Festival', mimeType: 'application/json', animation: { v: '5.7.4', fr: 30, ip: 0, op: 30, w: 100, h: 100, layers: [] } }, ACTOR);
  await service.save(null, { ...input, cityIds: [CITY], animationAssetId: asset._id }, ACTOR);
  const active = await runtime.getRuntime({ cityId: CITY }, () => NOW + 60_000);
  assert.equal(active.rendererVersion, 2); assert.equal(active.assets[asset._id].sha256, asset.sha256);
  assert.equal((await runtime.getRuntime({ cityId: CITY, rendererVersion: 1 }, () => NOW + 60_000)).campaign, null);
  await assert.rejects(assets.archiveAsset(asset._id, { expectedVersion: 1 }), { code: 'UI_ASSET_IN_USE' });
  const app = await serve(t, require('../../../mobile/backend/src/app'));
  t.mock.method(Date, 'now', () => NOW + 60_000);
  assert.equal((await app('GET', `/ui/assets/${asset._id}`)).status, 404);
  assert.equal((await app('GET', `/ui/assets/${asset._id}?campaignVersion=1&cityId=${CITY}`)).status, 200);
  assert.equal((await app('GET', `/ui/assets/${asset._id}?cityId=bad`)).status, 422);
  t.mock.method(Date, 'now', () => NOW + 120_000);
  assert.equal((await app('GET', `/ui/assets/${asset._id}?campaignVersion=1&cityId=${CITY}`)).status, 404);
});
