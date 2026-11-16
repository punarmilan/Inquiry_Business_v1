const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { installStore } = require('./ui-store.helper');
const contract = require('../src/validators/ui.validator');
const service = require('../src/services/uiConfigService');
const root = path.resolve(__dirname, '..'), mobile = path.resolve(root, '../../mobile/backend');
const ACTOR = '507f1f77bcf86cd799439011';
const styles = ['photoCarousel', 'heroShortcuts', 'splitCarousel', 'accordion'];
const page = (style = 'accordion') => ({ schemaVersion: 1, rendererVersion: 6, kind: 'page', key: 'offersHome',
  homeHeader: { style, autoPlay: true, intervalSeconds: 7, transition: style === 'accordion' ? 'expand' : 'slide', showArrows: true, showDots: true, height: 'medium' },
  slots: { beforeContent: [{ id: 'offers', type: 'homeCard', props: { placement: 'promo', title: { en: 'Watch local stories' }, media: 'bundled', bundled: 'offers', homeAction: 'link', linkUrl: 'https://www.youtube.com/watch?v=example&t=10' } }], afterContent: [] },
});

test('both APIs validate four header presets and HTTP links identically', () => {
  assert.equal(fs.readFileSync(path.join(root, 'src/validators/uiHomeHeader.js'), 'utf8'), fs.readFileSync(path.join(mobile, 'src/validators/uiHomeHeader.js'), 'utf8'));
  for (const api of [contract, require(path.join(mobile, 'src/validators/ui.validator'))]) {
    for (const style of styles) assert.deepEqual(api.validateConfig(page(style)), page(style));
    for (const url of ['http://example.com/a?x=1#section', 'https://youtu.be/example', 'https://example.com/%20']) {
      const config = page(); config.slots.beforeContent[0].props.linkUrl = url; assert.doesNotThrow(() => api.validateConfig(config));
    }
    for (const change of [
      p => { p.rendererVersion = 5; }, p => { p.key = 'login'; }, p => { p.homeHeader.style = 'custom'; },
      p => { p.homeHeader.transition = 'fade'; }, p => { p.homeHeader.intervalSeconds = 2; }, p => { p.homeHeader.height = 'huge'; },
      p => { p.homeHeader.unknown = true; }, p => { delete p.homeHeader.showDots; },
      p => { p.slots.beforeContent[0].props.placement = 'offer'; },
      p => { p.slots.beforeContent[0].props.homeAction = 'offers'; }, p => { delete p.slots.beforeContent[0].props.linkUrl; },
      ...['javascript:alert(1)', 'file:///tmp/a', 'intent://youtube', 'https://user:secret@example.com', 'https://', 'https://exa mple.com', 'https://example.com\\@other.com', 'https://example.com/\n'].map(url => p => { p.slots.beforeContent[0].props.linkUrl = url; }),
    ]) { const config = page(); change(config); assert.throws(() => api.validateConfig(config), { code: 'UI_CONFIG_INVALID' }); }
  }
});

test('publishing each header layout delivers exact links to new clients and safe fallback to old clients', async t => {
  installStore(t, [root, mobile]);
  let generation = 0;
  for (const style of styles) {
    const config = page(style);
    const draft = await service.createDraft({ config }, ACTOR);
    await service.publish(draft._id, { expectedDraftVersion: 1, expectedGeneration: generation++, reason: `Header ${style}` }, ACTOR);
    for (const directory of [root, mobile]) {
      const runtime = require(path.join(directory, 'src/services/uiRuntimeService'));
      const live = await runtime.getRuntime({ rendererVersion: 6 });
      assert.equal(live.enabled, true); assert.equal(live.rendererVersion, 6);
      assert.deepEqual(live.base.pages.offersHome, config);
      assert.equal((await runtime.getRuntime({ rendererVersion: 5 })).fallbackReason, 'unsupported_renderer');
    }
  }
});
