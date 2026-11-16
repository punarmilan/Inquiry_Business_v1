const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { installStore } = require('./ui-store.helper');
const contract = require('../src/validators/ui.validator');
const service = require('../src/services/uiConfigService');
const assets = require('../src/services/uiAssetService');
const campaigns = require('../src/services/uiCampaignService');
const { getRuntime } = require('../../../mobile/backend/src/services/uiRuntimeService');
const root = path.resolve(__dirname, '..'), mobile = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const page = (key, presentation = key === 'offersHome' ? {} : { headerVariant: 'compact' }) => ({ schemaVersion: 1, rendererVersion: 3, kind: 'page', key, presentation, slots: { beforeContent: [{ id: 'promo', type: 'illustration', props: { image: 'business', alt: { en: 'Local community' }, height: 120 } }], afterContent: [{ id: 'copy', type: 'text', props: { text: { en: 'Sample promotion' } } }] } });
const animation = () => ({ v: '5.7.4', fr: 30, ip: 0, op: 30, w: 100, h: 100, layers: [] });

test('renderer 3 contracts and mirrored metadata validate every reserved screen', () => {
  for (const key of contract.PAGE_KEYS) assert.deepEqual(contract.validateConfig(page(key)), page(key));
  const browser = fs.readFileSync(path.resolve(root, '../../mobile/frontend/src/utils/uiPresentation.json'), 'utf8');
  for (const backend of [root, mobile]) assert.equal(fs.readFileSync(path.join(backend, 'src/validators/uiPresentation.json'), 'utf8'), browser);
  for (const file of ['validators/ui.validator.js', 'services/uiRuntimeService.js', 'services/uiCampaignRuntime.js', 'models/UIRelease.js']) assert.equal(fs.readFileSync(path.join(root, 'src', file), 'utf8'), fs.readFileSync(path.join(mobile, 'src', file), 'utf8'));
});

test('screen schemas reject business, auth, payment and executable controls', () => {
  for (const [key, values] of [['plans', { price: 1 }], ['plans', { quotas: -1 }], ['plans', { categoryLayout: 'twoColumns' }], ['businessCenter', { verificationStatus: 'verified' }], ['login', { termsAccepted: true }], ['otp', { otpLength: 1 }], ['profile', { logout: false }], ['serviceProviders', { filter: 'all' }], ['offerDetails', { eligible: true }], ['onboarding', { route: 'Main' }]]) assert.throws(() => contract.validateConfig(page(key, values)), { code: 'UI_CONFIG_INVALID' });
  const image = page('profile'); image.slots.beforeContent[0].props.image = 'https://bad.test/remote.svg'; assert.throws(() => contract.validateConfig(image));
  for (const key of ['onboarding', 'login', 'otp', 'profileSetup']) {
    const input = page(key); input.slots.afterContent = [{ id: 'action', type: 'actionLink', props: { label: { en: 'Skip validation' }, action: 'offers.openAll' } }]; assert.throws(() => contract.validateConfig(input));
  }
});

test('v1/v2 snapshots remain compatible; v3-only features reject on older versions', () => {
  for (const rendererVersion of [1, 2]) {
    const input = { ...page('profile'), rendererVersion, slots: { beforeContent: [], afterContent: [] } }; delete input.presentation;
    assert.doesNotThrow(() => contract.validateConfig(input)); input.presentation = { cardVariant: 'soft' }; assert.throws(() => contract.validateConfig(input));
  }
  const input = page('login'); input.slots.beforeContent = [{ id: 'animation', type: 'lottie', props: { assetId: ACTOR, fallback: { en: 'Welcome' } } }];
  assert.doesNotThrow(() => contract.validateConfig(input)); delete input.presentation; input.rendererVersion = 2; assert.throws(() => contract.validateConfig(input));
});

test('all screens share draft/publish/rollback and preserve committed page references', async (t) => {
  installStore(t, [root, mobile]); let generation = 0, previous;
  for (const key of contract.PAGE_KEYS) {
    const draft = await service.createDraft({ config: page(key) }, ACTOR);
    const result = await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: 'Publish ' + key }, ACTOR);
    if (previous) for (const [pageKey, id] of Object.entries(previous.pageRevisionIds)) if (pageKey !== key) assert.equal(result.release.pageRevisionIds[pageKey], id);
    previous = result.release;
  }
  assert.equal((await getRuntime()).rendererVersion, 3); assert.equal(Object.keys(previous.pageRevisionIds).length, 13);
  assert.equal((await getRuntime({ rendererVersion: 2 })).fallbackReason, 'unsupported_renderer');
  const draft = await service.createDraft({ config: page('plans', { planLayout: 'compact' }) }, ACTOR);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: 'Compact plans' }, ACTOR);
  assert.equal((await getRuntime()).base.pages.plans.presentation.planLayout, 'compact');
  await service.rollback(String(previous._id), { expectedGeneration: generation, reason: 'Restore all screens' }, ACTOR);
  assert.equal((await getRuntime()).base.pages.plans.presentation.planLayout, undefined);
});

test('all page animations resolve together and page budgets remain enforced', async (t) => {
  installStore(t, [root, mobile]); let generation = 0;
  for (const key of contract.PAGE_KEYS) {
    const asset = await assets.createAsset({ name: key, mimeType: 'application/json', animation: animation() }, ACTOR);
    const input = page(key); input.slots.beforeContent = [{ id: 'animation', type: 'lottie', props: { assetId: String(asset._id), fallback: { en: 'Welcome' }, loop: false } }];
    const draft = await service.createDraft({ config: input }, ACTOR);
    await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: 'Animate ' + key }, ACTOR);
  }
  assert.equal(Object.keys((await getRuntime()).assets).length, 13);
  const invalid = page('plans'); invalid.slots.afterContent = Array.from({ length: 40 }, (_, index) => ({ id: 'space' + index, type: 'spacer', props: { height: 1 } })); assert.throws(() => contract.validateConfig(invalid));
});

test('runtime resolves published animation metadata once per snapshot', async (t) => {
  installStore(t, [root, mobile]);
  const asset = await assets.createAsset({ name: 'Runtime query budget', mimeType: 'application/json', animation: animation() }, ACTOR);
  const input = page('offersHome');
  input.slots.beforeContent = [{ id: 'animation', type: 'lottie', props: { assetId: String(asset._id), fallback: { en: 'Welcome' } } }];
  const draft = await service.createDraft({ config: input }, ACTOR);
  await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Query budget' }, ACTOR);
  const Model = require(path.join(mobile, 'src/models/UIAsset'));
  const original = Model.find;
  let reads = 0;
  t.mock.method(Model, 'find', function (...args) { reads++; return original.apply(this, args); });
  assert.equal(Object.keys((await getRuntime()).assets).length, 1);
  assert.equal(reads, 1);
});

test('campaign snapshots and optional animation retain v3 presentation until expiry', async (t) => {
  installStore(t, [root, mobile]);
  const draft = await service.createDraft({ config: page('plans', { cardVariant: 'outlined', planLayout: 'compact' }) }, ACTOR);
  const festival = await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: 0, reason: 'Festival plans' }, ACTOR);
  const baselineDraft = await service.createDraft({ config: page('plans') }, ACTOR);
  await service.publish(baselineDraft._id, { expectedDraftVersion: 1, expectedGeneration: 1, reason: 'Baseline plans' }, ACTOR);
  const asset = await assets.createAsset({ name: 'Festival', mimeType: 'application/json', animation: animation() }, ACTOR); const now = Date.now();
  await campaigns.save(null, { identifier: 'all-screens-festival', name: 'Festival', releaseId: festival.releaseId, startsAt: new Date(now + 1000).toISOString(), endsAt: new Date(now + 2000).toISOString(), state: 'scheduled', reason: 'Schedule all screens', animationAssetId: String(asset._id) }, ACTOR);
  const active = await getRuntime({ rendererVersion: 3, campaignVersion: 1 }, () => now + 1000);
  assert.equal(active.base.pages.plans.presentation.planLayout, 'compact'); assert.equal(active.rendererVersion, 3);
  assert.equal((await getRuntime({ campaignVersion: 1 }, () => now + 2000)).base.pages.plans.presentation.planLayout, undefined);
});
