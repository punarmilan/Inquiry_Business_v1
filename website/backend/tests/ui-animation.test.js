const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { validateAnimation, MAX_ANIMATION_BYTES } = require('../src/validators/uiAnimation');
const { sizedAnimation } = require('./ui-animation.fixture');
const assets = require('../src/services/uiAssetService');
const service = require('../src/services/uiConfigService');
const runtime = require('../src/services/uiRuntimeService');
const UIRevision = require('../src/models/UIRevision');
const { installStore, serve } = require('./ui-store.helper');
const root = path.resolve(__dirname, '..');
const mobile = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const animation = () => ({ v: '5.7.4', w: 200, h: 200, fr: 30, ip: 0, op: 60, assets: [], layers: [{ ty: 4, nm: 'Vector', shapes: [] }] });
const page = (id) => ({ schemaVersion: 1, rendererVersion: 2, kind: 'page', key: 'offersHome', slots: { beforeContent: [{ id: 'decoration', type: 'lottie', props: { assetId: id, fallback: { en: 'Local offers' }, width: 160, height: 120, loop: true, loopCount: 2 } }], afterContent: [] } });
test('vector upload rejects expressions, remote resources, malformed media, cycles and excessive budgets', () => {
  assert.equal(validateAnimation(animation()).duration, 2);
  for (const mutate of [
    (a) => { a.layers[0].ks = { x: 'alert(1)' }; }, (a) => { a.assets = [{ id: 'image', p: 'https://evil.test/a.png', u: '' }]; },
    (a) => { a.layers[0].ty = 5; }, (a) => { a.layers[0].ef = []; }, (a) => { a.w = 2049; }, (a) => { a.fr = 61; },
    (a) => { a.op = 10000; }, (a) => { a.fonts = {}; }, (a) => { a.layers = Array.from({ length: 101 }, () => ({ ty: 4 })); },
    (a) => { a.assets = [{ id: 'cycle', layers: [{ ty: 0, refId: 'cycle' }] }]; },
  ]) { const data = animation(); mutate(data); assert.throws(() => validateAnimation(data), { code: 'UI_ANIMATION_INVALID' }); }
  for (const file of ['models/UIAsset.js', 'validators/uiAnimation.js', 'services/uiAssetService.js']) assert.equal(fs.readFileSync(path.join(root, 'src', file), 'utf8'), fs.readFileSync(path.join(mobile, 'src', file), 'utf8'));
});
test('assets remain private until committed publication, v1 clients fall back, and rollback retains animation bytes', async (t) => {
  const state = installStore(t, [root, mobile]);
  const asset = await assets.createAsset({ name: 'Diya', mimeType: 'application/json', animation: animation() }, ACTOR);
  const request = await serve(t, require(path.join(mobile, 'src/app')));
  assert.equal((await request('GET', `/ui/assets/${asset._id}`)).status, 404);
  const draft = await service.createDraft({ config: page(asset._id) }, ACTOR);
  assert.equal((await request('GET', `/ui/assets/${asset._id}`)).status, 404);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Publish animation' }, ACTOR);
  const live = await runtime.getRuntime({ rendererVersion: 2 });
  assert.equal(live.assets[asset._id].sha256, asset.sha256);
  assert.equal(JSON.stringify(live).includes('shapes'), false);
  assert.equal((await runtime.getRuntime({ rendererVersion: 1 })).fallbackReason, 'unsupported_renderer');
  const publicAsset = await request('GET', `/ui/assets/${asset._id}`);
  assert.equal(publicAsset.status, 200);
  assert.deepEqual(publicAsset.body.asset.animation, animation());
  assert.equal((await request('GET', `/ui/assets/${asset._id}`, undefined, { 'If-None-Match': publicAsset.headers.etag })).status, 304);
  const head = state.head();
  await service.rollback(head.releaseId, { expectedGeneration: 1, reason: 'Restore animation' }, ACTOR);
  assert.equal((await runtime.getRuntime({ rendererVersion: 2 })).assets[asset._id].sha256, asset.sha256);
  await assets.updateAsset(asset._id, { expectedVersion: 1, name: 'Renamed diya', enabled: false });
  assert.equal((await runtime.getRuntime()).useNativeFallback, true);
  assert.equal((await request('GET', `/ui/assets/${asset._id}`)).status, 404);
});
test('asset versions and references protect updates and archival; missing assets cannot publish', async (t) => {
  installStore(t, [root]);
  const asset = await assets.createAsset({ name: 'Test', mimeType: 'application/json', animation: animation() }, ACTOR);
  await assets.updateAsset(asset._id, { expectedVersion: 1, name: 'Updated', enabled: true });
  await assert.rejects(assets.updateAsset(asset._id, { expectedVersion: 1, name: 'Stale', enabled: false }), { code: 'UI_ASSET_CONFLICT' });
  t.mock.method(UIRevision, 'exists', async () => ({ _id: 'referenced' }));
  await assert.rejects(assets.archiveAsset(asset._id, { expectedVersion: 2 }), { code: 'UI_ASSET_IN_USE' });
  t.mock.method(UIRevision, 'exists', async () => null);
  await assets.archiveAsset(asset._id, { expectedVersion: 2 });
  const draft = await service.createDraft({ config: page(asset._id) }, ACTOR);
  await assert.rejects(service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Invalid publication' }, ACTOR), { code: 'UI_ASSET_UNAVAILABLE' });
});
test('admin asset routes require existing active-admin authentication', async (t) => {
  const request = await serve(t, require('../src/app'));
  for (const [method, url] of [['GET', '/ui/assets'], ['POST', '/ui/assets'], ['GET', `/ui/assets/${ACTOR}`], ['PUT', `/ui/assets/${ACTOR}`], ['POST', `/ui/assets/${ACTOR}/archive`]]) assert.equal((await request(method, url, method === 'GET' ? undefined : {})).status, 401);
});

test('authenticated JSON upload, rename and validation use the actual admin HTTP contracts', async (t) => {
  installStore(t, [root]);
  t.mock.method(require('../src/models/AdminUser'), 'findById', async () => ({ _id: ACTOR, isActive: true, role: 'admin' }));
  const token = require('jsonwebtoken').sign({ sub: ACTOR, type: 'access' }, require('../src/config/env').jwtAccessSecret, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };
  const request = await serve(t, require('../src/app'));
  const body = { name: 'Vector', mimeType: 'application/json', animation: animation() };
  const created = await request('POST', '/ui/assets', body, headers);
  assert.equal(created.status, 201);
  assert.equal(created.body.asset.assetVersion, 1);
  assert.equal(created.headers['cache-control'], 'no-store');
  const id = created.body.asset._id;
  assert.equal((await request('GET', '/ui/assets', undefined, headers)).body.pagination.total, 1);
  assert.equal((await request('GET', `/ui/assets/${id}`, undefined, headers)).body.asset.animation.v, '5.7.4');
  assert.equal((await request('PUT', `/ui/assets/${id}`, { name: 'Renamed', enabled: true, expectedVersion: 1 }, headers)).body.asset.assetVersion, 2);
  assert.equal((await request('PUT', `/ui/assets/${id}`, { name: 'Stale', enabled: true, expectedVersion: 1 }, headers)).status, 409);
  for (const invalid of [{ ...body, mimeType: 'text/html' }, { ...body, unknown: true }, { ...body, animation: { ...animation(), fonts: {} } }]) assert.equal((await request('POST', '/ui/assets', invalid, headers)).status, 422);
});

test('10 MB animations upload, publish and download through both APIs; larger content is rejected', async (t) => {
  installStore(t, [root, mobile]);
  t.mock.method(require('../src/models/AdminUser'), 'findById', async () => ({ _id: ACTOR, isActive: true, role: 'admin' }));
  const token = require('jsonwebtoken').sign({ sub: ACTOR, type: 'access' }, require('../src/config/env').jwtAccessSecret, { expiresIn: '5m' });
  const request = await serve(t, require('../src/app'));
  const value = sizedAnimation(MAX_ANIMATION_BYTES);
  const uploaded = await request('POST', '/ui/assets', { name: 'Large vector', mimeType: 'application/json', animation: value }, { Authorization: `Bearer ${token}` });
  assert.equal(uploaded.status, 201);
  assert.equal(uploaded.body.asset.size, MAX_ANIMATION_BYTES);
  const id = uploaded.body.asset._id;
  const draft = await service.createDraft({ config: page(id) }, ACTOR);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Test large animation' }, ACTOR);
  const publicRequest = await serve(t, require(path.join(mobile, 'src/app')));
  const downloaded = await publicRequest('GET', `/ui/assets/${id}`);
  assert.equal(downloaded.status, 200);
  assert.equal(Buffer.byteLength(JSON.stringify(downloaded.body.asset.animation)), MAX_ANIMATION_BYTES);
  const oversized = sizedAnimation(MAX_ANIMATION_BYTES + 1);
  for (const validator of [validateAnimation, require(path.join(mobile, 'src/validators/uiAnimation')).validateAnimation]) {
    assert.throws(() => validator(oversized), { code: 'UI_ANIMATION_INVALID' });
  }
  const rejected = await request('POST', '/ui/assets', { name: 'Oversized', mimeType: 'application/json', animation: oversized }, { Authorization: `Bearer ${token}` });
  assert.equal(rejected.status, 422);
  assert.equal(rejected.body.error.code, 'UI_ANIMATION_INVALID');
});
