const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!fs.existsSync(file)) file = ['.ts', '.tsx'].map((suffix) => file + suffix).find(fs.existsSync);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const requireModule = (name) => /\.(png|jpg)$/.test(name) ? '/sample-artwork.png' : name in mocks ? mocks[name] : name === '@phosphor-icons/react' ? new Proxy({}, { get: () => () => null }) : name.startsWith('@/') ? load('src/' + name.slice(2)) : name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name);
    const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    new Function('require', 'module', 'exports', outputText)(requireModule, module, module.exports);
    return module.exports;
  }
  return load;
}

test('uploaded promotional images stay complete and receive no overlaid copy in every header preview', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const load = loader({ './UIAnimationPreview': { UIAnimationPreview: () => null }, './UIVisualAssets': { UIImagePreview: ({ fit }) => React.createElement('img', { style: { objectFit: fit } }) } });
  const { UIHomeCardPreview } = load('src/components/hyperlocal/UIHomeCardPreview');
  const card = load('../../mobile/frontend/src/utils/uiHome').defaultHomeCards()[0];
  Object.assign(card.props, { media: 'image', assetId: 'uploaded-art', showCopy: true, fit: 'cover' });
  for (const template of ['photoCarousel', 'heroShortcuts', 'splitCarousel', 'accordion', undefined]) {
    const markup = renderToStaticMarkup(React.createElement(UIHomeCardPreview, { card, template }));
    assert.ok(markup.includes('object-fit:contain'), template);
    assert.ok(!markup.includes('<strong') && !markup.includes('<p') && !markup.includes('<span'), 'original art has no added copy');
    assert.ok(!markup.includes('52%'), 'split preset does not crop uploaded art to a half panel');
  }
});

test('festival campaign templates reuse studio palettes and convert IST independent of browser timezone', () => {
  const load = loader();
  const { campaignPresets, campaignLocalTime, campaignInstant } = load('src/utils/uiCampaignPresets');
  const { themePresets } = load('src/utils/uiConfigSchema');
  for (const key of ['diwali', 'holi', 'christmas', 'new-year']) {
    assert.ok(themePresets[campaignPresets[key].themePreset]);
    assert.equal(campaignPresets[key].startsAt, undefined);
    assert.equal(campaignPresets[key].animationAssetId, undefined);
  }
  assert.equal(campaignInstant('2030-10-21T00:00'), '2030-10-20T18:30:00.000Z');
  assert.equal(campaignLocalTime('2030-10-20T18:30:00.000Z'), '2030-10-21T00:00');
});

test('screen-specific phone previews render all pages, protected controls and supported image sections', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
  const load = loader({ './client': {}, './UIAnimationPreview': { UIAnimationPreview: () => null } });
  const { UIPhonePreview } = load('src/components/hyperlocal/UIPhonePreview');
  const { emptyBase } = load('src/utils/uiConfigSchema'); const base = emptyBase();
  for (const page of Object.values(base.pages)) {
    page.rendererVersion = 3;
    if (page.key !== 'offersHome') page.presentation = { cardVariant: 'outlined' };
    page.slots.beforeContent = [{ id: 'image', type: 'illustration', props: { image: 'business', alt: { en: 'Community artwork' } } }];
    const markup = renderToStaticMarkup(React.createElement(UIPhonePreview, { page, theme: base.theme, mode: 'light' }));
    assert.ok(markup.includes('Protected native screen'), page.key); assert.ok(markup.includes('Community artwork'));
  }
});

test('one builder selects all supported screens and loads each workspace with the correct key', () => {
  const React = require('react'); let selected = 'offersHome'; const keys = [];
  const hooks = { ...React, useEffect: () => {}, useRef: (value) => ({ current: value }), useState: (initial) => initial === 'offersHome' ? [selected, (next) => { selected = next; }] : [typeof initial === 'function' ? initial() : initial, () => {}] };
  const load = loader({ react: hooks, './client': {}, '@phosphor-icons/react': { DotsSixVertical: () => null }, '@/hooks/useUIWorkspace': { useUIWorkspace: (_kind, key) => {
    keys.push(key); const base = load('src/utils/uiConfigSchema').emptyBase();
    return { config: base.pages[key], base, assets: {}, busy: false, ready: true, draft: null, head: null, drafts: [], releases: [], dirty: false, reason: '', historyPage: 1, historyPages: 1 };
  } } });
  const Component = load('src/pages/admin/UIPageBuilderPage').UIPageBuilderPage;
  const walk = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  let outer = Component(); let tree = outer.type(outer.props);
  const selector = walk(tree).find((node) => node.type === 'select' && node.props.value === 'offersHome');
  assert.equal(selector.props.children.length, 13); selector.props.onChange({ target: { value: 'plans' } });
  outer = Component(); tree = outer.type(outer.props);
  assert.equal(keys.at(-1), 'plans');
  assert.ok(walk(tree).some((node) => node.props?.page?.key === 'plans'));
});

test('actual builder handlers support drag/drop, undo/redo, visibility and asset properties', (t) => {
  const React = require('react'), state = []; let cursor = 0;
  const hooks = { ...React, useEffect() {}, useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], (next) => { state[i] = typeof next === 'function' ? next(state[i]) : next; }]; }, useRef(initial) { const i = cursor++; return state[i] ||= { current: initial }; } };
  const id = '507f1f77bcf86cd799439011'; let workspace;
  const load = loader({ react: hooks, './client': {}, '@phosphor-icons/react': { DotsSixVertical: () => null }, '@/hooks/useUIWorkspace': { useUIWorkspace: () => workspace } });
  const base = load('src/utils/uiConfigSchema').emptyBase();
  workspace = { config: base.pages.offersHome, base, assets: { [id]: { id } }, busy: false, ready: true, dirty: true, draft: null, head: null, drafts: [], releases: [], reason: '', historyPage: 1, historyPages: 1, setConfig: (value) => { workspace.config = value; } };
  const outer = load('src/pages/admin/UIPageBuilderPage').UIPageBuilderPage(); state.length = 0;
  const walk = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const render = () => { cursor = 0; return walk(outer.type(outer.props)); };
  const button = (label) => render().find((node) => [].concat(node.props?.children).flat(Infinity).filter((part) => typeof part === 'string').join('') === label && node.props?.onClick);
  button('Add Text').props.onClick(); button('Add Hero banner').props.onClick();
  const first = workspace.config.slots.beforeContent[0];
  const doc = global.document;
  global.document = { elementFromPoint: () => ({ closest: (selector) => selector === '[data-ui-slot]' ? { dataset: { uiSlot: 'afterContent' } } : null }) };
  t.after(() => { if (doc === undefined) delete global.document; else global.document = doc; });
  const handle = render().find((node) => node.props?.['aria-label'] === 'Drag text section 1');
  const event = { clientX: 0, clientY: 0, pointerId: 1, currentTarget: { setPointerCapture() {}, releasePointerCapture() {} } };
  handle.props.onPointerDown(event); handle.props.onPointerMove({ ...event, clientY: 100 }); handle.props.onPointerUp(event);
  assert.equal(workspace.config.slots.afterContent[0].id, first.id);
  button('Undo').props.onClick(); assert.equal(workspace.config.slots.beforeContent[0].id, first.id);
  button('Redo').props.onClick(); assert.equal(workspace.config.slots.afterContent[0].id, first.id);
  button('Add Lottie animation').props.onClick();
  const inspector = render().find((node) => node.props?.block?.type === 'lottie' && node.props?.onChange);
  const controls = walk(inspector.type(inspector.props));
  controls.find((node) => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: false } });
  assert.equal(workspace.config.slots.beforeContent.at(-1).hidden, true);
  assert.equal(workspace.config.slots.beforeContent.at(-1).props.assetId, id);
});

test('page builder creates valid renderer 3 sections without allowing auth actions or cross-screen rails', () => {
  const load = loader(); const utils = load('src/utils/uiPageBuilder'), { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const backend = require('../../backend/src/validators/ui.validator'); const base = emptyBase();
  for (const key of Object.keys(base.pages)) {
    const next = utils.addUIBlock(base.pages[key], 'beforeContent', utils.newUIBlock('illustration'));
    assert.equal(next.rendererVersion, 3); assert.doesNotThrow(() => backend.validateConfig(next)); assert.doesNotThrow(() => validateUIEditor(next, base));
  }
  assert.throws(() => backend.validateConfig(utils.addUIBlock(base.pages.login, 'beforeContent', utils.newUIBlock('actionLink'))));
  assert.throws(() => backend.validateConfig(utils.addUIBlock(base.pages.plans, 'beforeContent', utils.newUIBlock('offerRail'))));
});

test('campaign admin transport preserves optimistic versions and preview contracts', async () => {
  const calls = [];
  const client = Object.fromEntries(['get', 'post', 'put'].map((method) => [method, async (...args) => { calls.push({ method, args }); return { data: { campaign: { _id: 'campaign', version: 4 } } }; }]));
  const api = loader({ './client': client })('src/api/ui');
  const body = { expectedVersion: 3, state: 'scheduled', reason: 'Schedule test' };
  await api.saveUICampaign('campaign', body); await api.previewUICampaign(body); await api.listUICampaigns(2);
  assert.deepEqual(calls[0], { method: 'put', args: ['/ui/campaigns/campaign', body] });
  assert.equal(calls[1].args[0], '/ui/campaigns/preview');
  assert.equal(calls[2].args[1].params.page, 2);
});

test('campaign manager renders inside the existing admin design system with labelled controls and studio links', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MemoryRouter } = require('react-router-dom');
  const load = loader({ './client': {} });
  const Component = load('src/pages/admin/CampaignManagerPage.tsx').CampaignManagerPage;
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(Component)));
  for (const text of ['Scheduled campaigns', 'App colors', 'Animations', 'Dynamic UI editor', 'Asia/Kolkata', 'Festival template', 'Priority', 'Schedule campaign', 'Campaign schedule']) assert.ok(markup.includes(text), text);
});
test('all manual theme presets satisfy the shared native and backend contract in both modes', () => {
  const { themePresets, emptyBase, validateUIEditor } = loader()('src/utils/uiConfigSchema');
  const backend = require('../../backend/src/validators/ui.validator');
  assert.deepEqual(Object.keys(themePresets), ['Default', 'Diwali', 'Holi', 'Christmas', 'New Year']);
  for (const theme of Object.values(themePresets)) {
    assert.doesNotThrow(() => validateUIEditor(theme, emptyBase()));
    assert.doesNotThrow(() => backend.validateConfig(theme));
  }
});
test('browser editor rejects unsupported styling and incompatible page/theme combinations', () => {
  const { emptyBase, validateUIEditor } = loader()('src/utils/uiConfigSchema');
  const base = emptyBase();
  const theme = structuredClone(base.theme);
  theme.modes.light.colors.text = '#FFFFFF';
  assert.throws(() => validateUIEditor(theme, base));
  delete theme.modes.light.colors.text;
  theme.typography = { arbitraryFont: 'remote' };
  assert.throws(() => validateUIEditor(theme, base));
  const page = structuredClone(base.pages.offersHome);
  page.slots.beforeContent.push({ id: 'intro', type: 'heroBanner', props: { title: { en: 'Hello' }, backgroundToken: 'background' } });
  assert.doesNotThrow(() => validateUIEditor(page, base));
  page.slots.beforeContent[0].props.action = 'payments.skip';
  assert.throws(() => validateUIEditor(page, base));
});
test('admin transport preserves draft versions, publication generations and rollback contracts', async () => {
  const calls = [];
  const client = Object.fromEntries(['get', 'post', 'put'].map((method) => [method, async (...args) => { calls.push({ method, args }); return { data: { config: { _id: 'draft', draftVersion: 4 }, generation: 9 } }; }]));
  const api = loader({ './client': client })('src/api/ui');
  const config = { kind: 'theme', key: 'global' };
  await api.saveUIConfig(config, null, 'source');
  assert.deepEqual(calls.pop(), { method: 'post', args: ['/ui/configs', { config, sourceRevisionId: 'source' }] });
  const draft = { _id: 'draft', draftVersion: 3 };
  await api.saveUIConfig(config, draft);
  assert.deepEqual(calls.pop(), { method: 'put', args: ['/ui/configs/draft', { config, expectedDraftVersion: 3 }] });
  await api.publishUIDraft(draft, 9, 'Reviewed');
  assert.deepEqual(calls.pop().args, ['/ui/configs/draft/publish', { expectedDraftVersion: 3, expectedGeneration: 9, reason: 'Reviewed' }]);
  await api.rollbackUIRelease('release', 10, 'Restore');
  assert.deepEqual(calls.pop().args, ['/ui/releases/release/rollback', { expectedGeneration: 10, reason: 'Restore' }]);
  assert.match(api.uiError({ response: { status: 409 } }), /edits are retained/);
});

test('page builder produces one shared schema, stable reorder, visibility and protected slot boundaries', () => {
  const load = loader();
  const { newUIBlock, addUIBlock, moveUIBlock, updateUIBlock, removeUIBlock, pageBlocks } = load('src/utils/uiPageBuilder');
  const { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const backend = require('../../backend/src/validators/ui.validator');
  const base = emptyBase(); let page = base.pages.offersHome;
  const blocks = ['text', 'heroBanner', 'offerRail', 'actionLink', 'spacer'].map((type) => newUIBlock(type));
  for (const block of blocks) page = addUIBlock(page, 'beforeContent', block);
  assert.equal(new Set(pageBlocks(page).map((block) => block.id)).size, 5);
  assert.equal(base.pages.offersHome.slots.beforeContent.length, 0);
  page = moveUIBlock(page, blocks[0].id, 'beforeContent', blocks[2].id);
  assert.deepEqual(page.slots.beforeContent.map((block) => block.id), [blocks[1].id, blocks[2].id, blocks[0].id, blocks[3].id, blocks[4].id]);
  page = moveUIBlock(page, blocks[0].id, 'afterContent');
  assert.equal(page.slots.afterContent[0].id, blocks[0].id);
  page = updateUIBlock(page, { ...blocks[0], hidden: true });
  assert.equal(page.slots.afterContent[0].hidden, true);
  assert.doesNotThrow(() => validateUIEditor(page, base)); assert.doesNotThrow(() => backend.validateConfig(page));
  page = removeUIBlock(page, blocks[0].id);
  assert.equal(pageBlocks(page).length, 4);
  assert.deepEqual(Object.keys(page.slots), ['beforeContent', 'afterContent']);
  assert.equal(pageBlocks(page).some((block) => ['search', 'location', 'permissions'].includes(block.type)), false);
});
test('animation assignment and duplication cannot exceed the same runtime and page budgets', () => {
  const load = loader();
  const { newUIBlock, addUIBlock } = load('src/utils/uiPageBuilder');
  const { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const id = '507f1f77bcf86cd799439011';
  const assets = { [id]: { id, sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 2, size: 100 } };
  const base = emptyBase();
  const block = newUIBlock('lottie', id);
  const page = addUIBlock(base.pages.offersHome, 'beforeContent', block);
  assert.doesNotThrow(() => validateUIEditor(page, base, assets));
  assert.throws(() => validateUIEditor(page, base));
  assert.throws(() => addUIBlock(page, 'afterContent', newUIBlock('lottie', id)));
  assert.throws(() => newUIBlock('lottie'));
  let full = base.pages.offersHome;
  for (let i = 0; i < 40; i++) full = addUIBlock(full, 'beforeContent', newUIBlock('spacer'));
  assert.throws(() => addUIBlock(full, 'afterContent', newUIBlock('text')));
});

test('new admin routes and navigation entries are unique and preserve the existing editors', () => {
  for (const [file, field] of [['src/router/routes.tsx', 'path'], ['src/components/layout/navigation.ts', 'to']]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const url of ['/ui/themes', '/ui/animations', '/ui/pages/offersHome', '/home-content', '/home-showcase', '/offer-templates']) {
      assert.equal(source.split(`${field}: '${url}'`).length - 1, 1, `${url} in ${file}`);
    }
  }
});

test('theme, animation and builder pages render their real components without a backend or browser', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MemoryRouter } = require('react-router-dom');
  const load = loader({ './client': {}, '@phosphor-icons/react': { DotsSixVertical: () => null }, '@/components/shared/UnsavedChangesGuard': { UnsavedChangesGuard: () => null } });
  for (const [name, title] of [['ThemeStudioPage', 'App colors'], ['AnimationStudioPage', 'Animations'], ['UIPageBuilderPage', 'Dynamic UI editor']]) {
    const Component = load(`src/pages/admin/${name}.tsx`)[name];
    const markup = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(Component)));
    assert.ok(markup.includes(title));
    assert.ok(markup.includes('Publish to app'));
    assert.ok(markup.includes('Release history and rollback'));
    assert.equal(markup.includes('dangerouslySetInnerHTML'), false);
  }
});

function animationUploadHarness(upload) {
  const React = require('react');
  const state = []; let cursor = 0;
  const calls = [], registered = [];
  const asset = { _id: '507f1f77bcf86cd799439011', name: 'Festival', enabled: true, width: 100, height: 100, size: 100 };
  const load = loader({
    react: { ...React, useEffect() {}, useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], (next) => { state[i] = typeof next === 'function' ? next(state[i]) : next; }];
    } },
    './client': {},
    '@phosphor-icons/react': { Archive: () => null, FloppyDisk: () => null, Sparkle: () => null, UploadSimple: () => null },
    sonner: { toast: { success() {} } },
    '@/hooks/useUIWorkspace': { useUIWorkspace: () => ({ registerAsset: (value) => registered.push(value) }) },
    '@/api/ui': {
      listUIAssets: async () => ({ data: [asset], pagination: { pages: 1 } }),
      uploadUIAsset: async (...args) => { calls.push(args); if (upload) await upload(...args); return asset; },
      uiError: (error) => error.message,
    },
  });
  const Component = load('src/pages/admin/AnimationStudioPage').AnimationStudioPage;
  const walk = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  const render = () => { cursor = 0; return walk(Component()); };
  const input = () => render().find((node) => node.props?.type === 'file');
  const selectFile = (file) => {
    const target = { files: file ? [file] : [], value: file?.name || '' };
    input().props.onChange({ target });
    assert.equal(target.value, '', 'allow selecting the same file again after an error');
  };
  return { calls, registered, asset, render, input, selectFile };
}

test('animation upload reads JSON regardless of OS MIME type, filename case or UTF-8 BOM', async () => {
  const animation = { v: '5.7.4', fr: 30, ip: 0, op: 30, w: 100, h: 100, layers: [] };
  for (const type of ['application/json', '', 'text/plain', 'application/octet-stream', 'application/x-json']) {
    const h = animationUploadHarness();
    h.selectFile(new File(['\uFEFF' + JSON.stringify(animation)], 'Festival.JSON', { type }));
    assert.equal(h.input().props.disabled, true);
    assert.equal(h.input().props['aria-busy'], true);
    await new Promise(setImmediate);
    assert.deepEqual(h.calls, [['Festival', animation]], type);
    assert.deepEqual(h.registered, [h.asset]);
    assert.equal(h.input().props.disabled, false);
    assert.equal(h.input().props['aria-busy'], false);
    assert.equal(h.input().props['aria-invalid'], false);
  }
});

test('animation upload explains file failures before calling the API', async () => {
  for (const [file, message] of [
    [new File(['{}'], 'festival.lottie'), /\.json Lottie file/],
    [new File(['{}'], 'festival.json.zip'), /\.json Lottie file/],
    [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.json'), /limit is 10 MB/],
    [new File([], 'empty.json'), /empty/],
    [new File(['<html>Not JSON</html>'], 'invalid.json', { type: 'application/json' }), /invalid JSON/],
  ]) {
    const h = animationUploadHarness();
    h.selectFile(file);
    await new Promise(setImmediate);
    assert.deepEqual(h.calls, []);
    assert.equal(h.input().props.disabled, false);
    assert.equal(h.input().props['aria-invalid'], true);
    assert.match(h.input().props['aria-describedby'], /animation-upload-error/);
    const error = h.render().find((node) => node.props?.id === 'animation-upload-error');
    assert.equal(error.props.role, 'alert');
    assert.match(error.props.children, message);
  }
});

test('animation upload preserves server validation errors and recovers when the file is retried', async () => {
  let attempts = 0;
  const h = animationUploadHarness(async () => { if (++attempts === 1) throw new Error('Use a self-contained vector Lottie JSON'); });
  const file = new File(['{}'], 'festival.json');
  h.selectFile(file);
  await new Promise(setImmediate);
  assert.match(h.render().find((node) => node.props?.id === 'animation-upload-error').props.children, /self-contained vector/);
  assert.deepEqual(h.registered, []);
  h.selectFile(file);
  await new Promise(setImmediate);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.registered, [h.asset]);
  assert.equal(h.input().props['aria-invalid'], false);
  assert.equal(h.render().some((node) => node.props?.id === 'animation-upload-error'), false);
  h.selectFile(null);
  await new Promise(setImmediate);
  assert.equal(h.calls.length, 2, 'cancelling the picker does not upload');
});

test('animation upload accepts files at the 10 MB boundary and matches the API byte budget', async () => {
  const h = animationUploadHarness();
  const limit = loader()(path.resolve(root, '../../mobile/frontend/src/utils/uiAnimationLimits')).UI_ANIMATION_MAX_BYTES;
  assert.equal(limit, require('../../backend/src/validators/uiAnimation').MAX_ANIMATION_BYTES);
  const animation = require('../../backend/tests/ui-animation.fixture').sizedAnimation(limit);
  h.selectFile(new File([JSON.stringify(animation)], 'Large.JSON', { type: 'text/plain' }));
  await new Promise(setImmediate);
  assert.equal(h.calls.length, 1);
  assert.equal(Buffer.byteLength(JSON.stringify(h.calls[0][1])), limit);
  assert.equal(h.input().props['aria-invalid'], false);
});

test('visual image crop stays within the original frame at each ratio and zoom', () => {
  const { cropRectangle } = loader()('src/utils/uiImageCrop');
  assert.deepEqual(cropRectangle(4000, 2000, { ratio: 1, zoom: 1, x: 50, y: 50 }), { x: 1000, y: 0, width: 2000, height: 2000 });
  for (const ratio of [0, 1, 16 / 9, 3, 4 / 5]) for (const zoom of [1, 1.5, 3]) for (const position of [-1, 0, 50, 100, 101]) {
    const crop = cropRectangle(4000, 2000, { ratio, zoom, x: position, y: position });
    assert.ok(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0);
    assert.ok(crop.x + crop.width <= 4000.001 && crop.y + crop.height <= 2000.001);
    assert.ok(Math.abs(crop.width / crop.height - (ratio || 2)) < 0.001);
  }
});

test('visual sections raise renderer capability, retain image identity and preserve undo snapshots', () => {
  const load = loader(); const { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const { newUIBlock, addUIBlock, updateUIBlock } = load('src/utils/uiPageBuilder');
  const backend = require('../../backend/src/validators/ui.validator');
  const base = emptyBase(); const previous = structuredClone(base.pages.offersHome);
  const icon = newUIBlock('icon'); let page = addUIBlock(base.pages.offersHome, 'beforeContent', icon);
  assert.equal(page.rendererVersion, 4); assert.deepEqual(base.pages.offersHome, previous);
  page = updateUIBlock(page, { ...icon, props: { ...icon.props, name: 'Flame' }, style: { fontSize: 32, padding: 12, textAlign: 'center' } });
  assert.doesNotThrow(() => backend.validateConfig(page)); assert.doesNotThrow(() => validateUIEditor(page, base));
  const id = '507f1f77bcf86cd799439044'; const image = newUIBlock('image'); image.props.assetId = id;
  page = addUIBlock(page, 'beforeContent', image);
  assert.throws(() => validateUIEditor(page, base));
  assert.doesNotThrow(() => validateUIEditor(page, base, { [id]: { id, kind: 'image', mimeType: 'image/jpeg', size: 1000, width: 640, height: 360, fps: 0, duration: 0, sha256: 'a'.repeat(64) } }));
});

test('home controls seed every native placement and keep multiple animation assignments in the publishable draft', () => {
  const load = loader();
  const { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const { defaultHomeCards } = load('../../mobile/frontend/src/utils/uiHome');
  const { newUIBlock, addUIBlock } = load('src/utils/uiPageBuilder');
  const base = emptyBase(); let page = base.pages.offersHome;
  for (const card of defaultHomeCards()) page = addUIBlock(page, 'beforeContent', card);
  assert.equal(page.rendererVersion, 5);
  assert.deepEqual(page.slots.beforeContent.map(card => card.props.placement), ['promo', 'promo', 'promo', 'promo', 'aboveTrending', 'belowTrending', 'trending']);
  assert.equal(base.pages.offersHome.slots.beforeContent.length, 0);
  assert.doesNotThrow(() => validateUIEditor(page, base));
  const id = '507f1f77bcf86cd799439055';
  for (const index of [0, 4, 5, 6]) Object.assign(page.slots.beforeContent[index].props, { media: 'lottie', assetId: id });
  assert.throws(() => validateUIEditor(page, base));
  assert.doesNotThrow(() => validateUIEditor(page, base, { [id]: { id, sha256: 'a'.repeat(64), size: 1000, width: 100, height: 100, fps: 30, duration: 1 } }));
  assert.equal(newUIBlock('homeCard').props.media, 'bundled');
});

test('separate editors preserve each other’s content, presentation and renderer capability', () => {
  const load = loader();
  const { dynamicPage, mergeDynamicPage, replaceHomeCards } = load('src/utils/uiEditorParts');
  const { emptyBase } = load('src/utils/uiConfigSchema');
  const { defaultHomeCards } = load('../../mobile/frontend/src/utils/uiHome');
  const { newUIBlock, addUIBlock } = load('src/utils/uiPageBuilder');
  const base = emptyBase().pages.offersHome;
  base.presentation = { cardVariant: 'outlined' };
  const text = newUIBlock('text'), image = newUIBlock('image');
  let original = addUIBlock(addUIBlock(base, 'beforeContent', text), 'afterContent', image);
  original = replaceHomeCards(original, defaultHomeCards());
  const edited = dynamicPage(original);
  edited.slots.beforeContent[0] = { ...text, props: { ...text.props, text: { en: 'New section' } } };
  const merged = mergeDynamicPage(original, edited);
  assert.deepEqual(merged.slots.beforeContent.filter(block => block.type === 'homeCard'), defaultHomeCards());
  assert.equal(merged.rendererVersion, 5);
  const cards = structuredClone(defaultHomeCards()); cards[0].props.title.en = 'New home offer';
  const homeEdited = replaceHomeCards(merged, cards);
  assert.deepEqual(dynamicPage(homeEdited), dynamicPage(merged));
  assert.equal(original.slots.beforeContent[0].props.text.en, text.props.text.en, 'source draft remains immutable');
  assert.deepEqual(homeEdited.presentation, base.presentation);
  const tooMany = [...Array.from({ length: 34 }, () => newUIBlock('text'))];
  const full = { ...base, slots: { beforeContent: tooMany, afterContent: [] } };
  assert.throws(() => replaceHomeCards(full, defaultHomeCards()), /40/);
});

test('header presets and card links retain renderer 6 through both editor merge paths', () => {
  const load = loader();
  const { emptyBase, validateUIEditor } = load('src/utils/uiConfigSchema');
  const { dynamicPage, mergeDynamicPage, replaceHomeCards } = load('src/utils/uiEditorParts');
  const { HOME_HEADER_PRESETS, headerPreset } = load('../../mobile/frontend/src/utils/uiHomeHeader');
  const { defaultHomeCards } = load('../../mobile/frontend/src/utils/uiHome');
  const { updateUIBlock } = load('src/utils/uiPageBuilder');
  const base = emptyBase();
  for (const preset of HOME_HEADER_PRESETS) {
    const cards = defaultHomeCards(); Object.assign(cards[0].props, { homeAction: 'link', linkUrl: 'https://youtube.com/watch?v=example' });
    const original = replaceHomeCards(base.pages.offersHome, cards); original.homeHeader = headerPreset(preset.id);
    const edited = mergeDynamicPage(original, dynamicPage(original));
    assert.equal(edited.rendererVersion, 6); assert.deepEqual(edited.homeHeader, original.homeHeader);
    assert.deepEqual(edited.slots.beforeContent, original.slots.beforeContent);
    assert.doesNotThrow(() => validateUIEditor(edited, base));
    assert.equal(updateUIBlock(original, cards[0]).rendererVersion, 6);
    assert.deepEqual(replaceHomeCards(edited, cards).homeHeader, original.homeHeader);
  }
});
