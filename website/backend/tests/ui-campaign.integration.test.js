// Opt in with PHASE8_TEST_MONGO=mongodb://127.0.0.1:27028.
// Always creates and drops its own uniquely named database; never uses .env DBs.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { serve } = require('./ui-store.helper');

test('isolated MongoDB: Admin login → publish all screens → campaign → mobile store → expiry', { skip: !process.env.PHASE8_TEST_MONGO }, async (t) => {
  const endpoint = new URL(process.env.PHASE8_TEST_MONGO);
  assert.equal(endpoint.protocol, 'mongodb:');
  assert.ok(['127.0.0.1', 'localhost'].includes(endpoint.hostname), 'Integration database must be local');
  assert.ok(!endpoint.username && !endpoint.password && !endpoint.search);
  const dbName = `inquiryexperts_phase8_test_${process.pid}_${Date.now()}`;
  const uri = `${endpoint.origin === 'null' ? `mongodb://${endpoint.host}` : endpoint.origin}/${dbName}`;
  const adminMongo = require('mongoose');
  const mobileMongo = require('../../../mobile/backend/node_modules/mongoose');
  await Promise.all([adminMongo.connect(uri, { serverSelectionTimeoutMS: 3000 }), mobileMongo.connect(uri, { serverSelectionTimeoutMS: 3000 })]);
  t.after(async () => {
    assert.equal(adminMongo.connection.name, dbName);
    await adminMongo.connection.dropDatabase();
    await Promise.all([adminMongo.disconnect(), mobileMongo.disconnect()]);
  });
  const AdminUser = require('../src/models/AdminUser');
  await AdminUser.create({ name: 'Phase 8 Test Admin', email: 'phase8@example.com', passwordHash: await require('bcryptjs').hash('Phase8-test-only-482!', 4), role: 'admin' });
  const admin = await serve(t, require('../src/app'));
  const mobile = await serve(t, require('../../../mobile/backend/src/app'));
  await require('../src/models/UICampaign').init();
  const login = await admin('POST', '/auth/login', { email: 'phase8@example.com', password: 'Phase8-test-only-482!' });
  assert.equal(login.status, 200);
  const auth = { Authorization: `Bearer ${login.body.accessToken}` };
  let generation = 0;
  const publish = async (title, input) => {
    const created = await admin('POST', '/ui/configs', { config: input || { schemaVersion: 1, rendererVersion: 1, kind: 'page', key: 'offersHome', slots: { beforeContent: [{ id: 'banner', type: 'heroBanner', props: { title: { en: title } } }], afterContent: [] } } }, auth);
    assert.equal(created.status, 201);
    const result = await admin('POST', `/ui/configs/${created.body.config._id}/publish`, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: title }, auth);
    assert.equal(result.status, 201);
    return result.body;
  };
  const assetResult = await admin('POST', '/ui/assets', { name: 'All screen decoration', mimeType: 'application/json', animation: { v: '5.7.4', fr: 30, ip: 0, op: 30, w: 100, h: 100, layers: [] } }, auth);
  assert.equal(assetResult.status, 201);
  for (const key of require('../src/validators/ui.validator').PAGE_KEYS.filter((key) => key !== 'offersHome')) {
    await publish('Publish ' + key, { schemaVersion: 1, rendererVersion: 3, kind: 'page', key, presentation: key === 'plans' ? { planLayout: 'compact', cardVariant: 'outlined' } : { headerVariant: 'compact' }, slots: { beforeContent: [{ id: 'animation', type: 'lottie', props: { assetId: assetResult.body.asset._id, fallback: { en: 'Local community' }, loop: false } }], afterContent: [] } });
  }
  const festival = await publish('Festival banner');
  await publish('Default plans', { schemaVersion: 1, rendererVersion: 3, kind: 'page', key: 'plans', slots: { beforeContent: [], afterContent: [] } });
  await publish('Published default');
  const start = Date.now() - 1000, end = Date.now() + 60_000;
  const body = { identifier: 'diwali-integration', name: 'Diwali test', festival: 'diwali', releaseId: festival.releaseId,
    startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString(), priority: 10, state: 'scheduled', enabled: true, reason: 'Integration schedule' };
  const created = await admin('POST', '/ui/campaigns', body, auth);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.campaign.status, 'active');
  const duplicate = await admin('POST', '/ui/campaigns', { ...body, state: 'draft' }, auth);
  assert.equal(duplicate.status, 409); // actual Mongo unique index
  const preview = await admin('POST', '/ui/campaigns/preview', body, auth);
  assert.equal(preview.status, 200);
  const publicResult = await mobile('GET', '/ui/runtime?campaignVersion=1');
  assert.equal(publicResult.status, 200); assert.equal(publicResult.body.campaign.identifier, body.identifier);
  assert.equal(publicResult.body.base.pages.offersHome.slots.beforeContent[0].props.title.en, 'Festival banner');
  assert.equal(publicResult.body.base.pages.plans.presentation.planLayout, 'compact');
  assert.equal(publicResult.body.rendererVersion, 3);
  assert.equal((await mobile('GET', `/ui/assets/${assetResult.body.asset._id}?rendererVersion=3&campaignVersion=1`)).status, 200);
  assert.equal((await mobile('GET', '/ui/runtime?campaignVersion=1', undefined, { 'If-None-Match': publicResult.headers.etag })).status, 304);
  const frontendRoot = path.resolve(__dirname, '../../../mobile/frontend');
  const ts = require(path.join(frontendRoot, 'node_modules/typescript'));
  const cache = new Map();
  function load(file) {
    file = path.resolve(frontendRoot, file);
    if (!fs.existsSync(file)) file += '.ts';
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'module', 'exports', compiled)((name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name), module, module.exports);
    return module.exports;
  }
  const rows = new Map();
  let clientTime = Date.now();
  const store = load('src/services/uiRuntime').createUIRuntimeStore({ scope: uri, locale: 'en', now: () => clientTime,
    storage: { getItem: async (key) => rows.get(key) || null, setItem: async (key, value) => rows.set(key, value), removeItem: async (key) => rows.delete(key) },
    fetchRuntime: async () => ({ status: 200, body: publicResult.body, etag: publicResult.headers.etag, serverDate: publicResult.headers.date }) });
  await store.start();
  assert.equal(store.getSnapshot().config.campaign.identifier, body.identifier);
  await store.flushCache();
  clientTime += end - Date.parse(publicResult.body.serverTime) + 10;
  store.expire(); assert.equal(store.getSnapshot().config.useNativeFallback, true); store.stop();
  const runtimeFile = require.resolve('../../../mobile/backend/src/services/uiRuntimeService');
  delete require.cache[runtimeFile];
  const restarted = require(runtimeFile);
  assert.equal((await restarted.getRuntime({ campaignVersion: 1 }, () => start + 1000)).campaign.identifier, body.identifier);
  const expired = await restarted.getRuntime({ campaignVersion: 1 }, () => end);
  assert.equal(expired.campaign, null);
  assert.equal(expired.base.pages.offersHome.slots.beforeContent[0].props.title.en, 'Published default');
  assert.equal(expired.base.pages.plans.presentation, undefined);
  const draft = await admin('PUT', `/ui/campaigns/${created.body.campaign._id}`, { ...body, expectedVersion: 1, state: 'draft', reason: 'Cancel integration campaign' }, auth);
  assert.equal(draft.status, 200);
  assert.equal((await admin('PUT', `/ui/campaigns/${created.body.campaign._id}`, { ...body, expectedVersion: 1 }, auth)).status, 409);
  const defaultResult = await mobile('GET', '/ui/runtime?campaignVersion=1', undefined, { 'If-None-Match': publicResult.headers.etag });
  assert.equal(defaultResult.status, 200); assert.equal(defaultResult.body.campaign, null);
  assert.equal(defaultResult.body.base.pages.offersHome.slots.beforeContent[0].props.title.en, 'Published default');
  const runtime = require('../../../mobile/backend/src/services/uiRuntimeService');
  const restartedAtEnd = await runtime.getRuntime({ campaignVersion: 1 }, () => end);
  assert.equal(restartedAtEnd.campaign, null);
  const rolled = await admin('POST', `/ui/releases/${festival.releaseId}/rollback`, { expectedGeneration: defaultResult.body.generation, reason: 'Verify release rollback' }, auth);
  assert.equal(rolled.status, 201);
  const restored = await mobile('GET', '/ui/runtime?rendererVersion=3&campaignVersion=1', undefined, { 'If-None-Match': defaultResult.headers.etag });
  assert.equal(restored.status, 200);
  assert.equal(restored.body.generation, defaultResult.body.generation + 1);
  const restoredStore = load('src/services/uiRuntime').createUIRuntimeStore({ scope: uri + ':rollback', locale: 'en',
    storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} },
    fetchRuntime: async () => ({ status: 200, body: restored.body, etag: restored.headers.etag, serverDate: restored.headers.date }) });
  await restoredStore.start();
  assert.equal(restoredStore.getSnapshot().config.base.pages.plans.presentation.planLayout, 'compact');
  restoredStore.stop();
  // A fresh OS process must read the persisted head, not an earlier process cache.
  const { promisify } = require('node:util');
  const execute = promisify(require('node:child_process').execFile);
  const script = `const m=require('mongoose'); (async()=>{await m.connect(process.argv[1]); const r=await require('./src/services/uiRuntimeService').getRuntime({rendererVersion:3,campaignVersion:1}); console.log('RUNTIME:'+JSON.stringify({generation:r.generation,releaseId:r.releaseId,planLayout:r.base.pages.plans.presentation?.planLayout})); await m.disconnect();})().catch(()=>process.exit(1));`;
  const fresh = await execute(process.execPath, ['-e', script, uri], { cwd: path.resolve(__dirname, '..'), timeout: 10000 });
  const freshBody = JSON.parse(fresh.stdout.split(/\r?\n/).find((line) => line.startsWith('RUNTIME:')).slice(8));
  assert.equal(freshBody.generation, restored.body.generation);
  assert.equal(freshBody.releaseId, restored.body.releaseId);
  assert.equal(freshBody.planLayout, 'compact');
  t.diagnostic(`Real Mongo runtime: ${Buffer.byteLength(JSON.stringify(restored.body))} bytes; rollback and fresh-process head recovery verified.`);
});
