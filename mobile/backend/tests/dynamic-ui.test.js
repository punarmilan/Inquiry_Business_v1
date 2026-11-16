const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Setting = require('../src/models/Setting');
const UIRevision = require('../src/models/UIRevision');
const { getRuntime } = require('../src/services/uiRuntimeService');
const contract = require('../src/validators/ui.validator');
const { installStore, serve } = require('../../../website/backend/tests/ui-store.helper');
const admin = require('../../../website/backend/src/services/uiConfigService');
const root = path.resolve(__dirname, '..');
const adminRoot = path.resolve(root, '../../website/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const page = () => ({ schemaVersion: 1, rendererVersion: 1, kind: 'page', key: 'offersHome',
  slots: { beforeContent: [{ id: 'intro', type: 'text', props: { text: { en: 'Published layout' } } }], afterContent: [] } });
const publishInput = { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Publish mobile layout' };

test('public runtime returns a valid native fallback without any published configuration', async (t) => {
  installStore(t, [root]);
  const result = await getRuntime();
  assert.equal(result.success, true);
  assert.equal(result.releaseId, null);
  assert.equal(result.generation, 0);
  assert.equal(result.useNativeFallback, true);
  assert.equal(result.enabled, false);
  assert.equal(result.fallbackReason, 'not_published');
  assert.equal(Object.keys(result.base.pages).length, 13);
  for (const page of Object.values(result.base.pages)) assert.doesNotThrow(() => contract.validateConfig(page));
  assert.doesNotThrow(() => contract.validateConfig(result.base.theme));
  assert.equal(Date.parse(result.refreshAfter) - Date.parse(result.serverTime), 60_000);
  assert.equal(Date.parse(result.validUntil) - Date.parse(result.serverTime), 7 * 86400_000);
});

test('mobile runtime resolves admin-published snapshots and never includes draft content or actors', async (t) => {
  installStore(t, [root, adminRoot]);
  const draft = await admin.createDraft({ config: page() }, ACTOR);
  assert.equal((await getRuntime()).base.pages.offersHome.slots.beforeContent.length, 0);
  const published = await admin.publish(draft._id, publishInput, ACTOR);
  const changed = page(); changed.slots.beforeContent[0].props.text.en = 'Private unsaved design';
  await admin.updateDraft(draft._id, { config: changed, expectedDraftVersion: 1 }, ACTOR);
  const result = await getRuntime();
  assert.equal(result.releaseId, published.releaseId);
  assert.equal(result.generation, 1);
  assert.equal(result.useNativeFallback, false);
  assert.equal(result.base.pages.offersHome.slots.beforeContent[0].props.text.en, 'Published layout');
  for (const privateField of ['Private unsaved design', 'createdBy', 'updatedBy', ACTOR, 'sourceRevisionId', 'reason']) {
    assert.ok(!JSON.stringify(result).includes(privateField), privateField);
  }
});

test('unsupported renderers, disabled/corrupt references, missing revisions and DB failure fail closed', async (t) => {
  const store = installStore(t, [root, adminRoot]);
  const draft = await admin.createDraft({ config: page() }, ACTOR);
  const published = await admin.publish(draft._id, publishInput, ACTOR);
  const unsupported = await getRuntime({ rendererVersion: 7 });
  assert.equal(unsupported.fallbackReason, 'unsupported_renderer');
  assert.equal(unsupported.base.pages.offersHome.slots.beforeContent.length, 0);
  store.head().enabled = false;
  assert.equal((await getRuntime()).fallbackReason, 'disabled');
  store.head().enabled = true;
  const id = published.release.pageRevisionIds.offersHome;
  const revision = store.revisions.get(id);
  store.revisions.delete(id);
  assert.equal((await getRuntime()).fallbackReason, 'unavailable');
  store.revisions.set(id, { ...revision, status: 'draft' });
  assert.equal((await getRuntime()).fallbackReason, 'unavailable');
  store.revisions.set(id, { ...revision, config: { arbitraryExecutable: true } });
  assert.equal((await getRuntime()).fallbackReason, 'unavailable');
  store.head().generation = -1;
  assert.equal((await getRuntime()).fallbackReason, 'unavailable');
  t.mock.method(Setting, 'findOne', () => ({ lean: async () => { throw new Error('Database unavailable'); } }));
  const failed = await getRuntime();
  assert.equal(failed.useNativeFallback, true);
  assert.ok(!JSON.stringify(failed).includes('Database unavailable'));
});

test('registered mobile endpoint is public, validates query dimensions and supports stable ETags/304', async (t) => {
  installStore(t, [root, adminRoot]);
  const request = await serve(t, require('../src/app'));
  const initial = await request('GET', '/ui/runtime?rendererVersion=1&locale=hi');
  assert.equal(initial.status, 200);
  assert.equal(initial.body.fallbackReason, 'not_published');
  assert.match(initial.headers.etag, /^W\/"[a-f0-9]{64}"$/);
  const unchanged = await request('GET', '/ui/runtime?rendererVersion=1&locale=hi', undefined, { 'If-None-Match': initial.headers.etag });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body, null);
  const draft = await admin.createDraft({ config: page() }, ACTOR);
  await admin.publish(draft._id, publishInput, ACTOR);
  const published = await request('GET', '/ui/runtime', undefined, { 'If-None-Match': initial.headers.etag });
  assert.equal(published.status, 200);
  assert.notEqual(published.headers.etag, initial.headers.etag);
  assert.equal(published.body.base.pages.offersHome.slots.beforeContent[0].props.text.en, 'Published layout');
  for (const query of ['role=admin', 'rendererVersion=-1', 'cityId=bad', 'locale=xx', 'rendererVersion=1&rendererVersion=2']) {
    assert.equal((await request('GET', `/ui/runtime?${query}`)).status, 422, query);
  }
  assert.equal((await request('GET', '/ui/runtime?rendererVersion=7')).body.fallbackReason, 'unsupported_renderer');
  assert.equal((await request('GET', '/ui/configs')).status, 404);
  assert.equal((await request('GET', `/ui/releases/${ACTOR}`)).status, 404);
  assert.equal((await request('POST', '/ui/configs', { config: page() })).status, 404);
});

test('legacy public settings exclude reserved UI metadata and preserve existing keys', async (t) => {
  const store = installStore(t, [root]);
  await Setting.create({ key: 'ui.activeRelease', type: 'json', value: { releaseId: ACTOR, generation: 1, enabled: true } });
  await Setting.create({ key: 'ui.privateDraft', type: 'json', value: { secretDraft: true } });
  await Setting.create({ key: 'mobile.splash.tagline', type: 'content', value: 'Original tagline' });
  const request = await serve(t, require('../src/app'));
  const response = await request('GET', '/settings');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.settings, { 'mobile.splash.tagline': 'Original tagline' });
  assert.deepEqual(store.queries.find((entry) => entry.name === 'Setting').filter, { key: { $not: /^ui\./ } });
});

test('public delivery never reads draft revisions while hydrating a release', async (t) => {
  const store = installStore(t, [root, adminRoot]);
  const draft = await admin.createDraft({ config: page() }, ACTOR);
  await admin.publish(draft._id, publishInput, ACTOR);
  store.queries.length = 0;
  await getRuntime();
  assert.ok(store.queries.filter((entry) => entry.name === 'UIRevision').every((entry) => entry.filter.status === 'published'));
  assert.equal(UIRevision.collection.name, 'uirevisions');
});
