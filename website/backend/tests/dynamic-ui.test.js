const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const jwt = require('jsonwebtoken');
const contract = require('../src/validators/ui.validator');
const service = require('../src/services/uiConfigService');
const runtime = require('../src/services/uiRuntimeService');
const UIRevision = require('../src/models/UIRevision');
const UIRelease = require('../src/models/UIRelease');
const AdminUser = require('../src/models/AdminUser');
const env = require('../src/config/env');
const { installStore, serve } = require('./ui-store.helper');
const root = path.resolve(__dirname, '..');
const mobileRoot = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const page = (text = 'Local offers') => ({ schemaVersion: 1, rendererVersion: 1, kind: 'page', key: 'offersHome',
  slots: { beforeContent: [{ id: 'intro', type: 'text', props: { text: { en: text, hi: 'Local offers' }, variant: 'heading' } }], afterContent: [] } });
const theme = () => ({ schemaVersion: 1, kind: 'theme', key: 'global', modes: { light: { colors: { background: '#FFFFFF', text: '#111111' } }, dark: { colors: { background: '#000000', text: '#FFFFFF' } } } });
const input = { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Publish initial layout' };

test('contract accepts bounded native blocks/themes and backend mirrors are identical', () => {
  assert.deepEqual(contract.validateConfig(page()), page());
  assert.deepEqual(contract.validateConfig(theme()), theme());
  const config = page();
  config.slots.beforeContent = [
    { id: 'hero', type: 'heroBanner', props: { title: { en: 'Explore' }, buttonLabel: { en: 'View offers' }, action: 'offers.openAll' } },
    { id: 'rail', type: 'offerRail', props: { source: 'showcase', variant: 'compact', limit: 6 } },
    { id: 'space', type: 'spacer', props: { height: 24 } },
    { id: 'link', type: 'actionLink', props: { label: { en: 'Settings' }, action: 'profile.openSettings' } },
  ];
  assert.doesNotThrow(() => contract.validateConfig(config));
  for (const file of ['validators/ui.validator.js', 'models/UIRevision.js', 'models/UIRelease.js', 'services/uiRuntimeService.js']) {
    assert.equal(fs.readFileSync(path.join(root, 'src', file), 'utf8'), fs.readFileSync(path.join(mobileRoot, 'src', file), 'utf8'), file);
  }
});

test('validation rejects unsafe properties, executable content, unsupported components and invalid themes', () => {
  const mutations = [
    (c) => { c.schemaVersion = 2; }, (c) => { c.rendererVersion = 7; },
    (c) => { c.roles = ['admin']; }, (c) => { c.slots.header = []; },
    (c) => { c.slots.beforeContent[0].props.onPress = 'eval(code)'; },
    (c) => { c.slots.beforeContent[0].props.text.en = '<script>alert(1)</script>'; },
    (c) => { c.slots.beforeContent[0].props.text.en = 'javascript:alert(1)'; },
    (c) => { c.slots.beforeContent[0].props.text.en = '{{user.role}}'; },
    (c) => { c.slots.beforeContent[0].props.style = { position: 'absolute' }; },
    (c) => { c.slots.beforeContent.push(c.slots.beforeContent[0]); },
    (c) => { c.slots.beforeContent = Array.from({ length: 41 }, (_, n) => ({ id: `space${n}`, type: 'spacer', props: { height: 1 } })); },
    (c) => { c.slots.beforeContent = [{ id: 'space', type: 'spacer', props: { height: 49 } }]; },
    ...['webview', 'animation', 'image'].map((type) => (c) => { c.slots.beforeContent[0].type = type; }),
    (c) => { c.slots.beforeContent[0].props.text.en = 'x'.repeat(501); },
    (c) => { c.slots.beforeContent[0].props.text.en = 'x'.repeat(contract.MAX_BYTES); },
  ];
  for (const mutate of mutations) { const config = page(); mutate(config); assert.throws(() => contract.validateConfig(config), { code: 'UI_CONFIG_INVALID' }); }
  assert.throws(() => contract.validateConfig(JSON.parse('{"__proto__":{"polluted":true}}')), { code: 'UI_CONFIG_INVALID' });
  assert.throws(() => contract.validateConfig({ kind: 'campaign' }), { code: 'UI_CONFIG_INVALID' });
  const auth = page(); auth.key = 'login'; auth.slots.beforeContent = [{ id: 'link', type: 'actionLink', props: { label: { en: 'Go' }, action: 'business.openCenter' } }];
  assert.throws(() => contract.validateConfig(auth), { code: 'UI_CONFIG_INVALID' });
  for (const edit of [(c) => { c.modes.light.colors.text = '#FFFFFF'; }, (c) => { c.modes.dark.colors.text = '#000000'; },
    (c) => { c.modes.light.colors.fontFamily = 'remote-font'; }, (c) => { c.modes.light.colors.primary = 'url(javascript:evil)'; }]) {
    const config = theme(); edit(config); assert.throws(() => contract.validateConfig(config), { code: 'UI_CONFIG_INVALID' });
  }
});

test('draft create/update/validate uses optimistic versions and cannot affect live customers', async (t) => {
  const store = installStore(t, [root]);
  const draft = await service.createDraft({ config: page() }, ACTOR);
  assert.equal(draft.draftVersion, 1);
  assert.equal(store.head(), undefined);
  assert.equal((await runtime.getRuntime()).fallbackReason, 'not_published');
  assert.equal((await service.validateDraft(draft._id, 1)).valid, true);
  const updated = await service.updateDraft(draft._id, { config: page('Updated draft'), expectedDraftVersion: 1 }, ACTOR);
  assert.equal(updated.draftVersion, 2);
  await assert.rejects(service.updateDraft(draft._id, { config: page(), expectedDraftVersion: 1 }, ACTOR), { code: 'UI_VERSION_CONFLICT' });
  const mismatch = page(); mismatch.key = 'more';
  await assert.rejects(service.updateDraft(draft._id, { config: mismatch, expectedDraftVersion: 2 }, ACTOR), { code: 'UI_CONFIG_INVALID' });
  assert.equal((await runtime.getRuntime()).base.pages.offersHome.slots.beforeContent.length, 0);
  assert.equal(store.releases.size, 0);
});

test('publish freezes snapshots and preserves existing page/theme references', async (t) => {
  const store = installStore(t, [root]);
  const draft = await service.createDraft({ config: page() }, ACTOR);
  const first = await service.publish(draft._id, input, ACTOR);
  assert.equal(first.generation, 1);
  const revisionId = first.release.pageRevisionIds.offersHome;
  assert.equal(store.revisions.get(revisionId).status, 'published');
  await service.updateDraft(draft._id, { config: page('Unpublished change'), expectedDraftVersion: 1 }, ACTOR);
  assert.equal((await runtime.getRuntime()).base.pages.offersHome.slots.beforeContent[0].props.text.en, 'Local offers');
  await assert.rejects(service.updateDraft(revisionId, { config: page(), expectedDraftVersion: 1 }, ACTOR), { code: 'UI_REVISION_IMMUTABLE' });
  const themeDraft = await service.createDraft({ config: theme() }, ACTOR);
  const second = await service.publish(themeDraft._id, { ...input, expectedGeneration: 1 }, ACTOR);
  assert.equal(second.release.pageRevisionIds.offersHome, revisionId);
  assert.equal(second.release.previousReleaseId, first.releaseId);
  const result = await runtime.getRuntime();
  assert.equal(result.enabled, true);
  assert.equal(result.base.theme.modes.light.colors.text, '#111111');
  assert.equal(result.overlay, null);
  assert.deepEqual(result.assets, {});
  assert.ok(!JSON.stringify(result).includes('createdBy'));
  assert.ok(!JSON.stringify(result).includes('Unpublished change'));
});

test('failed publication/incompatible layouts cannot replace the live pointer or enter history', async (t) => {
  const store = installStore(t, [root]);
  const draft = await service.createDraft({ config: page() }, ACTOR);
  const first = await service.publish(draft._id, input, ACTOR);
  store.failRelease = true;
  await assert.rejects(service.publish(draft._id, { ...input, expectedGeneration: 1 }, ACTOR), /Simulated release/);
  store.failRelease = false; store.failActivation = true;
  await assert.rejects(service.publish(draft._id, { ...input, expectedGeneration: 1 }, ACTOR), /Simulated pointer/);
  store.failActivation = false;
  const bad = page(); bad.slots.beforeContent[0].props.backgroundToken = 'primary';
  const badDraft = await service.createDraft({ config: bad }, ACTOR);
  await assert.rejects(service.publish(badDraft._id, { ...input, expectedGeneration: 1 }, ACTOR), { code: 'UI_CONFIG_INVALID' });
  assert.equal(store.head().releaseId, first.releaseId);
  assert.equal((await service.listReleases({})).pagination.total, 1);
  const orphan = [...store.releases.values()].find((row) => row._id !== first.releaseId);
  await assert.rejects(service.getRelease(orphan._id), { code: 'UI_RELEASE_NOT_FOUND' });
  await assert.rejects(service.rollback(orphan._id, { expectedGeneration: 1, reason: 'Cannot select orphan' }, ACTOR), { code: 'UI_RELEASE_NOT_FOUND' });
});

test('concurrent first/subsequent publishers have one winner; stale generations/draft versions reject', async (t) => {
  const store = installStore(t, [root]);
  const draft = await service.createDraft({ config: page() }, ACTOR);
  for (const expectedGeneration of [0, 1]) {
    const results = await Promise.allSettled([1, 2].map(() => service.publish(draft._id, { ...input, expectedGeneration }, ACTOR)));
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'UI_VERSION_CONFLICT');
    assert.equal(store.head().generation, expectedGeneration + 1);
  }
  await assert.rejects(service.publish(draft._id, input, ACTOR), { code: 'UI_VERSION_CONFLICT' });
  await service.updateDraft(draft._id, { config: page('Changed'), expectedDraftVersion: 1 }, ACTOR);
  await assert.rejects(service.publish(draft._id, { ...input, expectedGeneration: 2 }, ACTOR), { code: 'UI_VERSION_CONFLICT' });
  assert.equal((await service.listReleases({})).pagination.total, 2);
});

test('rollback validates a complete historical snapshot and creates an audited new generation', async (t) => {
  const store = installStore(t, [root]);
  const draft = await service.createDraft({ config: page('Original') }, ACTOR);
  const first = await service.publish(draft._id, input, ACTOR);
  await service.updateDraft(draft._id, { config: page('Second'), expectedDraftVersion: 1 }, ACTOR);
  const second = await service.publish(draft._id, { ...input, expectedDraftVersion: 2, expectedGeneration: 1 }, ACTOR);
  const result = await service.rollback(first.releaseId, { expectedGeneration: 2, reason: 'Restore original layout' }, ACTOR);
  assert.equal(result.generation, 3);
  assert.equal(result.release.rolledBackFrom, first.releaseId);
  assert.equal(result.release.previousReleaseId, second.releaseId);
  assert.equal((await runtime.getRuntime()).base.pages.offersHome.slots.beforeContent[0].props.text.en, 'Original');
  assert.equal((await service.listReleases({ page: 2, limit: 1 })).data[0]._id, second.releaseId);
  await assert.rejects(service.rollback(first.releaseId, { expectedGeneration: 2, reason: 'Stale rollback' }, ACTOR), { code: 'UI_VERSION_CONFLICT' });
  store.revisions.delete(first.release.pageRevisionIds.offersHome);
  await assert.rejects(service.rollback(first.releaseId, { expectedGeneration: 3, reason: 'Missing frozen reference' }, ACTOR), { code: 'UI_CONFIG_INVALID' });
  assert.equal(store.head().generation, 3);
});

test('Mongoose guards reject mutations of frozen revisions and releases', async () => {
  for (const Model of [UIRevision, UIRelease]) {
    const code = Model === UIRevision ? 'UI_REVISION_IMMUTABLE' : 'UI_RELEASE_IMMUTABLE';
    for (const operation of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany']) {
      const filter = { _id: ACTOR, status: 'published' };
      const query = operation.startsWith('delete') ? Model[operation](filter) : Model[operation](filter, { $set: { reason: 'Changed after publish' } });
      await assert.rejects(query.exec(), { code });
    }
  }
  assert.equal(UIRevision.schema.options.minimize, false);
  assert.equal(UIRelease.schema.options.minimize, false);
});

test('draft updates pass real Mongoose query middleware and retain the CAS predicate', async (t) => {
  let observed;
  t.mock.method(UIRevision.collection, 'findOneAndUpdate', async (filter, update, options) => {
    observed = { filter, update, options };
    return null;
  });
  await UIRevision.findOneAndUpdate({ _id: ACTOR, status: 'draft', draftVersion: 1 },
    { $set: { config: page(), updatedBy: ACTOR }, $inc: { draftVersion: 1 } }, { new: true });
  assert.equal(String(observed.filter._id), ACTOR);
  assert.equal(observed.filter.status, 'draft');
  assert.equal(observed.filter.draftVersion, 1);
  assert.deepEqual(observed.update.$set.config, page());
  assert.equal(observed.update.$inc.draftVersion, 1);
  assert.equal(observed.options.returnDocument, 'after');
});

test('combined release budget and per-screen slot budgets validate before activation', () => {
  const base = contract.defaultBase();
  const body = { en: 'x'.repeat(500), hi: 'y'.repeat(500) };
  for (const key of contract.PAGE_KEYS) {
    base.pages[key].slots.beforeContent = Array.from({ length: 40 }, (_, n) => ({ id: `line${n}`, type: 'text', props: { text: body } }));
  }
  assert.throws(() => contract.checkBase(base), { code: 'UI_CONFIG_INVALID' });
  const config = page();
  config.slots.beforeContent = Array.from({ length: 20 }, (_, n) => ({ id: `before${n}`, type: 'spacer', props: { height: 1 } }));
  config.slots.afterContent = Array.from({ length: 21 }, (_, n) => ({ id: `after${n}`, type: 'spacer', props: { height: 1 } }));
  assert.throws(() => contract.validateConfig(config), { code: 'UI_CONFIG_INVALID' });
});

test('theme-first publication keeps empty page references and allows safe draft forks', async (t) => {
  installStore(t, [root]);
  const draft = await service.createDraft({ config: theme() }, ACTOR);
  const release = await service.publish(draft._id, input, ACTOR);
  assert.deepEqual(release.release.pageRevisionIds, {});
  assert.equal((await runtime.getRuntime()).useNativeFallback, false);
  const fork = await service.createDraft({ config: theme(), sourceRevisionId: release.release.themeRevisionId }, ACTOR);
  assert.equal(fork.draftVersion, 1);
  assert.equal(fork.status, 'draft');
  assert.equal(fork.sourceRevisionId, String(release.release.themeRevisionId));
  await assert.rejects(service.createDraft({ config: page(), sourceRevisionId: release.release.themeRevisionId }, ACTOR), { code: 'UI_CONFIG_INVALID' });
});

test('registered admin routes enforce active-admin authentication, strict requests and reserved settings', async (t) => {
  installStore(t, [root]);
  t.mock.method(AdminUser, 'findById', async (id) => String(id) === ACTOR ? { _id: ACTOR, isActive: true, role: 'admin' } : null);
  const request = await serve(t, require('../src/app'));
  const token = jwt.sign({ sub: ACTOR, type: 'access' }, env.jwtAccessSecret, { expiresIn: '5m' });
  const headers = { Authorization: `Bearer ${token}` };
  for (const [method, url, body] of [['GET', '/ui/configs'], ['POST', '/ui/configs', {}], ['PUT', `/ui/configs/${ACTOR}`, {}],
    ['POST', '/ui/configs/validate', {}], ['POST', `/ui/configs/${ACTOR}/validate`, {}], ['POST', `/ui/configs/${ACTOR}/publish`, {}],
    ['GET', '/ui/releases'], ['GET', `/ui/releases/${ACTOR}`], ['POST', `/ui/releases/${ACTOR}/rollback`, {}]]) {
    assert.equal((await request(method, url, body)).status, 401, url);
  }
  for (const invalid of ['invalid', jwt.sign({ sub: ACTOR, type: 'refresh' }, env.jwtAccessSecret),
    jwt.sign({ sub: '507f1f77bcf86cd799439099', type: 'access' }, env.jwtAccessSecret), jwt.sign({ sub: ACTOR, type: 'access' }, 'different-secret')]) {
    assert.equal((await request('GET', '/ui/configs', undefined, { Authorization: `Bearer ${invalid}` })).status, 401);
  }
  const validated = await request('POST', '/ui/configs/validate', { config: page() }, headers);
  assert.equal(validated.body.valid, true);
  assert.equal(validated.headers['cache-control'], 'no-store');
  assert.equal((await request('POST', '/ui/configs', { config: page(), arbitrary: true }, headers)).status, 422);
  assert.equal((await request('GET', '/ui/configs?kind=campaign', undefined, headers)).status, 422);
  assert.equal((await request('GET', '/ui/configs?limit=1000', undefined, headers)).status, 422);
  const created = await request('POST', '/ui/configs', { config: page() }, headers);
  assert.equal(created.status, 201);
  const id = created.body.config._id;
  assert.equal((await request('GET', `/ui/configs/${id}`, undefined, headers)).status, 200);
  assert.equal((await request('POST', `/ui/configs/${id}/validate`, { expectedDraftVersion: 1 }, headers)).body.valid, true);
  assert.equal((await request('PUT', `/ui/configs/${id}`, { config: page('New'), expectedDraftVersion: 1 }, headers)).body.config.draftVersion, 2);
  const published = await request('POST', `/ui/configs/${id}/publish`, { ...input, expectedDraftVersion: 2 }, headers);
  assert.equal(published.status, 201);
  assert.equal((await request('GET', '/ui/releases', undefined, headers)).body.pagination.total, 1);
  assert.equal((await request('GET', `/ui/releases/${published.body.releaseId}`, undefined, headers)).status, 200);
  assert.equal((await request('POST', `/ui/releases/${published.body.releaseId}/rollback`, { expectedGeneration: 1, reason: 'Restore published version' }, headers)).body.generation, 2);
  const reserved = await request('PUT', '/settings/ui.activeRelease', { type: 'json', value: {} }, headers);
  assert.equal(reserved.status, 403);
  assert.equal(reserved.body.error.code, 'UI_SETTING_RESERVED');
  assert.equal((await request('PUT', '/settings/mobile.testContent', { type: 'content', value: 'Existing settings still work' }, headers)).status, 200);
});
