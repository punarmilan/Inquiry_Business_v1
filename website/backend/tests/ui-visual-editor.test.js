const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { installStore, serve } = require('./ui-store.helper');
const contract = require('../src/validators/ui.validator');
const { validateImage } = require('../src/validators/uiImage');
const assets = require('../src/services/uiAssetService');
const service = require('../src/services/uiConfigService');
const runtime = require('../src/services/uiRuntimeService');
const root = path.resolve(__dirname, '..'), mobile = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W36kAAAAASUVORK5CYII=';
const page = (assetId) => ({ schemaVersion: 1, rendererVersion: 4, kind: 'page', key: 'offersHome', slots: { beforeContent: [
  { id: 'hero', type: 'heroBanner', props: { title: { en: 'A new look' }, imageAssetId: assetId, imageHeight: 160 }, style: { padding: 16, fontSize: 28, textAlign: 'center', borderRadius: 24, color: '#172033', backgroundColor: '#FFFFFF' } },
  { id: 'photo', type: 'image', props: { assetId, alt: { en: 'Festival banner' }, height: 180, fit: 'cover' }, style: { widthPercent: 80, alignment: 'center', borderRadius: 16 } },
  { id: 'gift', type: 'icon', props: { name: 'Gift', size: 40, label: { en: 'Celebrate local' } }, style: { padding: 12, textAlign: 'center' } },
] , afterContent: [] } });

test('visual schema stays identical in both APIs and rejects unsupported style, icon and media inputs', () => {
  for (const file of ['validators/uiVisual.json', 'validators/uiImage.js', 'validators/ui.validator.js', 'models/UIAsset.js', 'models/UIRelease.js', 'services/uiAssetService.js']) {
    assert.equal(fs.readFileSync(path.join(root, 'src', file), 'utf8'), fs.readFileSync(path.join(mobile, 'src', file), 'utf8'), file);
  }
  assert.equal(fs.readFileSync(path.join(root, 'src/validators/uiVisual.json'), 'utf8'), fs.readFileSync(path.resolve(root, '../../mobile/frontend/src/utils/uiVisual.json'), 'utf8'));
  assert.doesNotThrow(() => contract.validateConfig(page(ACTOR)));
  for (const mutate of [
    (p) => { p.rendererVersion = 3; }, (p) => { p.slots.beforeContent[0].style.position = 'absolute'; },
    (p) => { p.slots.beforeContent[0].style.fontSize = 200; }, (p) => { p.slots.beforeContent[0].style.color = 'url(https://bad.test)'; },
    (p) => { p.slots.beforeContent[0].style.color = '#FFFFFF'; }, (p) => { p.slots.beforeContent[1].props.assetId = 'https://bad.test/banner.png'; },
    (p) => { p.slots.beforeContent[2].props.name = '<svg onload=bad()>'; },
  ]) { const value = page(ACTOR); mutate(value); assert.throws(() => { contract.validateConfig(value); const base = contract.defaultBase(); base.pages.offersHome = value; contract.checkBase(base); }); }
});

test('image uploads validate actual bytes, dimensions, MIME, base64 and size', () => {
  const valid = validateImage({ mimeType: 'image/png', dataBase64: png });
  assert.equal(valid.kind, 'image'); assert.equal(valid.width, 1); assert.equal(valid.height, 1);
  for (const input of [
    { mimeType: 'image/jpeg', dataBase64: png }, { mimeType: 'image/svg+xml', dataBase64: png },
    { mimeType: 'image/png', dataBase64: Buffer.from('<script>bad()</script>').toString('base64') },
    { mimeType: 'image/png', dataBase64: png + '!' }, { mimeType: 'image/png', dataBase64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') },
  ]) assert.throws(() => validateImage(input), { code: 'UI_IMAGE_INVALID' });
  const huge = Buffer.from(png, 'base64'); huge.writeUInt32BE(3000, 16);
  assert.throws(() => validateImage({ mimeType: 'image/png', dataBase64: huge.toString('base64') }), { code: 'UI_IMAGE_INVALID' });
});

test('images stay private in drafts, publish as bounded binary media and retain backward fallback', async (t) => {
  installStore(t, [root, mobile]);
  t.mock.method(require('../src/models/AdminUser'), 'findById', async () => ({ _id: ACTOR, isActive: true, role: 'admin' }));
  const token = require('jsonwebtoken').sign({ sub: ACTOR, type: 'access' }, require('../src/config/env').jwtAccessSecret, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };
  const admin = await serve(t, require('../src/app')), publicApp = await serve(t, require(path.join(mobile, 'src/app')));
  assert.equal((await admin('POST', '/ui/assets/image', { name: 'Festival', mimeType: 'image/png', dataBase64: png })).status, 401);
  const uploaded = await admin('POST', '/ui/assets/image', { name: 'Festival', mimeType: 'image/png', dataBase64: png }, headers);
  assert.equal(uploaded.status, 201); assert.equal(uploaded.body.asset.kind, 'image'); assert.equal(uploaded.body.asset.data, undefined);
  const id = uploaded.body.asset._id;
  assert.equal((await admin('GET', `/ui/assets/${id}/content`)).status, 401);
  assert.equal((await admin('GET', `/ui/assets/${id}/content`, undefined, headers)).headers['content-type'], 'image/png');
  assert.equal((await publicApp('GET', `/ui/assets/${id}?rendererVersion=4`)).status, 404);
  const draft = await service.createDraft({ config: page(id) }, ACTOR);
  assert.equal((await publicApp('GET', `/ui/assets/${id}?rendererVersion=4`)).status, 404);
  await service.validateDraft(draft._id, 1);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Publish visual editor test' }, ACTOR);
  const live = await runtime.getRuntime({ rendererVersion: 4 });
  assert.equal(live.enabled, true); assert.equal(live.assets[id].kind, 'image'); assert.equal(live.assets[id].fps, 0);
  assert.equal((await runtime.getRuntime({ rendererVersion: 3 })).fallbackReason, 'unsupported_renderer');
  const delivered = await publicApp('GET', `/ui/assets/${id}?rendererVersion=4`);
  assert.equal(delivered.status, 200); assert.equal(delivered.headers['content-type'], 'image/png'); assert.equal(delivered.headers['x-content-type-options'], 'nosniff');
  assert.equal((await publicApp('GET', `/ui/assets/${id}?rendererVersion=4`, undefined, { 'If-None-Match': delivered.headers.etag })).status, 304);
  assert.equal((await publicApp('GET', `/ui/assets/${id}?rendererVersion=3`)).status, 404);
  const invalidBase = contract.defaultBase(); invalidBase.pages.offersHome = page(id); invalidBase.pages.offersHome.slots.beforeContent = [{ id: 'bad', type: 'lottie', props: { assetId: id, fallback: { en: 'Fallback' } } }];
  await assert.rejects(assets.resolveAssets(invalidBase), { code: 'UI_ASSET_UNAVAILABLE' });
});

test('home cards publish multiple managed animations and images with renderer-4 fallback and retained assets', async t => {
  installStore(t, [root, mobile]);
  const animation = { v: '5.7.4', w: 100, h: 100, fr: 30, ip: 0, op: 30, assets: [], layers: [] };
  const lottie = await assets.createAsset({ name: 'Home animation', mimeType: 'application/json', animation }, ACTOR);
  const image = await assets.createImage({ name: 'Home image', mimeType: 'image/png', dataBase64: png }, ACTOR);
  const animationId = String(lottie._id), imageId = String(image._id);
  const card = (id, placement, media, assetId) => ({ id, type: 'homeCard', props: { placement, title: { en: id, hi: 'लोकल ऑफ़र' }, media, bundled: 'offers', assetId }, style: { color: '#08152F', backgroundColor: '#FFFFFF' } });
  const config = { schemaVersion: 1, rendererVersion: 5, kind: 'page', key: 'offersHome', slots: { beforeContent: [card('promo', 'promo', 'lottie', animationId), card('banner', 'aboveTrending', 'lottie', animationId), card('below', 'belowTrending', 'image', imageId)], afterContent: [] } };
  assert.deepEqual(contract.validateConfig(config), config);
  const draft = await service.createDraft({ config }, ACTOR);
  const publicApp = await serve(t, require(path.join(mobile, 'src/app')));
  assert.equal((await publicApp('GET', `/ui/assets/${animationId}?rendererVersion=5`)).status, 404);
  assert.equal((await runtime.getRuntime({ rendererVersion: 5 })).enabled, false);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Publish home controls' }, ACTOR);
  const live = await runtime.getRuntime({ rendererVersion: 5 });
  assert.equal(live.enabled, true);
  assert.equal(live.base.pages.offersHome.slots.beforeContent.length, 3);
  assert.deepEqual(Object.keys(live.assets).sort(), [animationId, imageId].sort());
  const delivered = await publicApp('GET', `/ui/assets/${animationId}?rendererVersion=5`);
  assert.equal(delivered.status, 200); assert.deepEqual(delivered.body.asset.animation, animation);
  assert.equal((await publicApp('GET', `/ui/assets/${imageId}?rendererVersion=5`)).headers['content-type'], 'image/png');
  assert.equal((await publicApp('GET', `/ui/assets/${animationId}?rendererVersion=4`)).status, 404);
  assert.equal((await runtime.getRuntime({ rendererVersion: 4 })).fallbackReason, 'unsupported_renderer');
  const retainedQueries = [];
  t.mock.method(require('../src/models/UIRevision'), 'exists', async query => { retainedQueries.push(query); return true; });
  await assert.rejects(assets.archiveAsset(animationId, { expectedVersion: 1 }), { code: 'UI_ASSET_IN_USE' });
  assert.ok(retainedQueries[0].$or.some(query => query['config.slots.beforeContent.props.assetId'] === animationId));
  const invalid = contract.defaultBase(); invalid.pages.offersHome = structuredClone(config); invalid.pages.offersHome.slots.beforeContent[0].props.assetId = imageId;
  await assert.rejects(assets.resolveAssets(invalid), { code: 'UI_ASSET_UNAVAILABLE' });
  for (const change of [p => { p.rendererVersion = 4; }, p => { p.key = 'login'; }, p => { p.slots.beforeContent[0].props.homeAction = 'https://bad.test'; }, p => { p.slots.beforeContent[0].props.assetId = 'https://bad.test/file.json'; }, p => { p.slots.beforeContent.push({ ...p.slots.beforeContent[1], id: 'duplicate' }); }]) {
    const copy = structuredClone(config); change(copy); assert.throws(() => contract.validateConfig(copy), { code: 'UI_CONFIG_INVALID' });
  }
});
