const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
const TIME = Date.parse('2026-10-18T09:00:00.000Z');
const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Execute the actual TypeScript modules with isolated native/network boundaries.
// This compiles only local source under test; no remote configuration is executable.
function loader({ mocks = {}, fetch = globalThis.fetch, react = React, dev = false } = {}) {
  const cache = new Map();
  const native = { Platform: { OS: 'android' }, StyleSheet: { create: (styles) => styles, absoluteFill: {}, absoluteFillObject: {} }, View: 'View', Text: 'Text', ScrollView: 'ScrollView',
    Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } };
  function load(relative) {
    let file = path.isAbsolute(relative) ? relative : path.resolve(root, relative);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = ['.ts', '.tsx', '/index.ts', '/index.tsx'].map((suffix) => file + suffix).find(fs.existsSync);
    if (!file) throw new Error(`Missing test module ${relative}`);
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const requireModule = (name) => {
      if (/\.(png|jpg)$/.test(name)) return 1;
      if (name in mocks) return mocks[name];
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'lucide-react-native') return new Proxy({}, { get: (_target, key) => (props) => React.createElement(String(key), props) });
      if (name === '@react-navigation/native') return { useIsFocused: () => true };
      if (name === '@react-native-async-storage/async-storage') return storage();
      if (name === 'expo-constants') return { expoConfig: { extra: { apiBaseUrl: 'https://ui.test' } } };
      if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
      return require(name);
    };
    const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } });
    new Function('require', 'module', 'exports', '__DEV__', 'fetch', outputText)(requireModule, module, module.exports, dev, fetch);
    return module.exports;
  }
  return { load, native };
}
const storage = () => {
  const rows = new Map();
  return { rows, getItem: async (key) => rows.get(key) || null, setItem: async (key, value) => { rows.set(key, value); }, removeItem: async (key) => { rows.delete(key); } };
};
const response = (body, etag = 'W/"release"') => ({ status: 200, body, etag, serverDate: new Date(TIME).toUTCString() });
function fixture(load, generation = 1) {
  return { ...clone(load('src/utils/dynamicUI').defaultUIRuntime(TIME)), enabled: true, useNativeFallback: false,
    fallbackReason: null, generation, releaseId: generation.toString(16).padStart(24, '0') };
}
const makeStore = (load, store, fetchRuntime, extra = {}) => load('src/services/uiRuntime').createUIRuntimeStore({
  scope: 'https://ui.test', locale: 'en', storage: store, fetchRuntime, now: () => TIME, ...extra,
});

const elements = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
function nativeScreen({ api = {}, app = {}, options = {}, mocks = {} } = {}) {
  let cursor = 0, refCursor = 0, focused = false; const slots = [], refs = [], calls = [];
  const react = { ...React, useMemo: (work) => work(), useCallback: (work) => work, useEffect: () => {}, useLayoutEffect: () => {}, useRef: (value) => { const index = refCursor++; return refs[index] ||= { current: value }; }, useState: (initial) => {
    const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  } };
  const appearance = { option: (key) => options[key] || 'default', copy: (_key, fallback) => fallback, card: {}, header: {}, title: {}, content: {}, selector: {}, iconColor: '#123456', hasSections: true };
  const state = { accessToken: 'test-token', businesses: [], refreshBusinesses: async () => {}, refreshProfile: async () => {}, remoteSettings: {}, t: (key) => key, language: 'en', ...app };
  const h = loader({ react, mocks: {
    '../../hooks/useUIPage': { useUIPage: () => appearance }, '../../context/AppContext': { useApp: () => state }, '../../services/api': api,
    '../../components/ScreenContainer': { ScreenContainer: 'NativeScreen' }, '../../components/DynamicRenderer': { DynamicRenderer: 'DynamicSlot' },
    '../../components/Button': { Button: 'Button' }, '../../components/IconButton': { IconButton: 'IconButton' }, '../../components/Input': { Input: 'Input' }, '../../components/PlanPaymentSheet': { PlanPaymentSheet: 'PaymentSheet' }, '../../components/Avatar': { Avatar: 'Avatar' }, '../../components/GoogleMark': { GoogleMark: 'GoogleMark' }, '../../components/LogoLoader': { LogoLoader: 'LogoLoader' },
    '../../components/CityPickerModal': { CityPickerModal: 'CityPicker' }, '../../components/LanguageToggle': { LanguageToggle: 'LanguageToggle' }, '../../components/NeonUI': { SkylineMasthead: 'SkylineMasthead' },
    '../../services/socialAuth': { signInWithGoogle: async () => ({}) },
    '@react-navigation/native': { useFocusEffect: (work) => { if (!focused) { focused = true; work(); } }, useIsFocused: () => true },
    '@react-navigation/bottom-tabs': { useBottomTabBarHeight: () => 60 },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 20, bottom: 20 }) },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    'lucide-react-native': Object.fromEntries(['ArrowLeft','ChevronRight','Crown','LifeBuoy','LogOut','MapPin','MoreVertical','Store','Tag','UserCog','Bookmark','CreditCard','Bell','Languages','FileText','ShieldCheck','Tags','Siren','X'].map((name) => [name, name])),
    'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path', Rect: 'Rect', Circle: 'Circle', Defs: 'Defs', LinearGradient: 'SvgGradient', Stop: 'Stop' },
    './ServiceUI': { ServiceHeader: 'ServiceHeader', ServiceSearch: 'ServiceSearch', ServiceImage: 'ServiceImage', ServiceBackdrop: 'ServiceBackdrop', safeIcon: () => 'tools', isEmergencyCategory: (name) => /police/i.test(name), serviceColors: { background: '#FFFFFF', teal: '#118F91' }, ui: {} },
    './OfferUI': { colors: { bg: '#FFFFFF', ink: '#111111', teal: '#118F91' }, money: (value) => String(value), whatsappUrl: (value) => 'https://wa.me/' + value, openContact: (value) => calls.push(['contact', value]), OfferArtwork: 'OfferArtwork', RemotePhoto: 'RemotePhoto', RoundAction: 'RoundAction' },
    ...mocks,
  } });
  Object.assign(h.native, { FlatList: 'FlatList', Image: 'Image', ImageBackground: 'ImageBackground', TextInput: 'TextInput', Platform: { OS: 'android' }, StatusBar: 'StatusBar', useWindowDimensions: () => ({ width: 390, height: 844 }), Animated: { Value: class { stopAnimation() {} }, View: 'AnimatedView' },
    Alert: { alert: (...args) => calls.push(['alert', ...args]) }, Linking: { openURL: async (url) => calls.push(['link', url]) }, Share: { sharedAction: 'shared', share: async (value) => { calls.push(['share', value]); return { action: 'shared' }; } } });
  return { ...h, calls, slots, refs, state, render: (Component, props = {}) => { cursor = 0; refCursor = 0; return Component(props); } };
}

test('home restores saved hearts, prevents duplicate toggles and rolls back a failed save', async () => {
  let resolveToggle, rejectToggle, toggles = 0;
  const offer = { _id: 'saved-offer', title: 'Local deal', category: 'Shopping', discountPercentage: 40, startsAt: '2026-10-01', distanceKm: 1 };
  const routes = [];
  let publishedHome;
  const h = nativeScreen({ api: {
    listSavedOffers: async () => ({ data: [offer] }),
    toggleSavedOffer: () => { toggles++; return new Promise((resolve, reject) => { resolveToggle = resolve; rejectToggle = reject; }); },
  }, mocks: {
    '../../hooks/useUIConfig': { useUIConfig: () => ({ refresh: async () => {}, locale: 'en', state: publishedHome ? { config: publishedHome } : undefined }) },
    '../../hooks/useHyperlocalLocation': { useHyperlocalLocation: () => ({ location: { latitude: 18, longitude: 73, locality: 'Nigdi', city: { _id: 'pune', name: 'Pune' } }, cities: [], setPickerVisible() {} }) },
    '../../components/HyperlocalHeader': { HyperlocalHeader: 'Header' },
    '../../components/UIHomeBanner': { UIHomeBanner: 'HomeBanner' },
    '../../components/OfferCard': { OfferCard: 'OfferCard' },
    '../../components/NeonUI': { SectionHeading: 'Heading' },
    '../../navigation/hideTabBarOnScroll': { showTabBar() {} },
    './OfferUI': { offerCategories: [] },
    './HomePromoCarousel': { HomePromoCarousel: 'Promo' },
    './HomeShortcuts': { HomeShortcuts: 'ServiceShortcuts' },
    '@react-native-community/slider': { __esModule: true, default: 'Slider' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  } });
  Object.assign(h.native, { Modal: 'Modal', RefreshControl: 'RefreshControl' });
  const Home = h.load('src/screens/offers/OffersHomeScreen').OffersHomeScreen;
  const props = { navigation: { navigate: (...args) => routes.push(args), getParent: () => ({ navigate: (...args) => routes.push(args) }) } };
  const emptyHome = elements(h.render(Home, props));
  const emptyBanner = emptyHome.find(node => node.props?.accessibilityLabel === 'homeMoreDealsTitle navExplore');
  assert.ok(emptyBanner, 'bottom banner stays visible before nearby offers arrive');
  emptyBanner.props.onPress();
  assert.equal(routes.pop()[0], 'AllOffers');
  h.render(Home, props); await tick(); h.slots[0] = [offer];
  const card = () => elements(h.render(Home, props)).find(node => node.type === 'OfferCard');
  assert.equal(card().props.saved, true);
  const pending = card().props.onSave();
  assert.equal(card().props.saved, false);
  await card().props.onSave();
  assert.equal(toggles, 1);
  rejectToggle(new Error('Offline')); await pending;
  assert.equal(card().props.saved, true);
  const confirmed = card().props.onSave(); resolveToggle({ saved: false }); await confirmed;
  assert.equal(card().props.saved, false);
  const nodes = elements(h.render(Home, props));
  const shortcut = key => elements(h.render(Home, props)).find(node => node.type === 'ServiceShortcuts').props.onSelect(key);
  shortcut('offers'); assert.deepEqual(routes.pop(), ['AllOffers', { latitude: 18, longitude: 73, cityId: 'pune', locality: 'Nigdi' }]);
  shortcut('services'); assert.deepEqual(routes.pop(), ['ServicesTab', { screen: 'ServicesHome' }]);
  shortcut('post'); assert.deepEqual(routes.pop(), ['MoreTab', { screen: 'BusinessCenter' }]);
  shortcut('events'); assert.ok(h.calls.some(call => call[0] === 'alert' && call[1] === 'postStatusUpcoming' && call[2] === 'quickTileEvent postOptionComingSoon'));
  nodes.find(node => node.type === 'Promo').props.onPost();
  assert.deepEqual(routes.pop(), ['MoreTab', { screen: 'BusinessCenter' }]);
  h.state.hasApprovedBusiness = true;
  shortcut('post'); assert.deepEqual(routes.pop(), ['PostTab', { screen: 'PostMenu' }]);
  elements(h.render(Home, props)).find(node => node.type === 'Promo').props.onPost();
  assert.deepEqual(routes.pop(), ['PostTab', { screen: 'PostMenu' }]);
  publishedHome = fixture(h.load); publishedHome.rendererVersion = 5;
  const controls = h.load('src/utils/uiHome').defaultHomeCards();
  publishedHome.base.pages.offersHome.rendererVersion = 5;
  publishedHome.base.pages.offersHome.slots.beforeContent = controls;
  controls[0].props.title.en = 'Admin promotion';
  controls[4].props.homeAction = 'services';
  controls[5].hidden = true;
  Object.assign(controls[6].props, { media: 'lottie', assetId: '507f1f77bcf86cd799439055', limit: 1 });
  const managed = elements(h.render(Home, props));
  assert.equal(managed.find(node => node.type === 'Promo').props.cards[0].props.title.en, 'Admin promotion');
  assert.equal(managed.filter(node => node.type === 'OfferCard').length, 1);
  assert.equal(managed.find(node => node.type === 'OfferCard').props.homeMedia.props.assetId, '507f1f77bcf86cd799439055');
  managed.find(node => node.type === 'HomeBanner' && node.props.card.id === 'home_support').props.onPress();
  assert.deepEqual(routes.pop(), ['ServicesTab', { screen: 'ServicesHome' }]);
  controls[6].hidden = true;
  assert.equal(elements(h.render(Home, props)).filter(node => node.type === 'OfferCard').length, 0);
  controls.filter(card => card.props.placement === 'promo').forEach(card => {
    card.hidden = true; card.props.homeAction = 'link'; card.props.linkUrl = 'https://example.com/ad'; card.props.title.en = 'Paid promotion';
  });
  shortcut('offers'); assert.deepEqual(routes.pop(), ['AllOffers', { latitude: 18, longitude: 73, cityId: 'pune', locality: 'Nigdi' }]);
  shortcut('services'); assert.deepEqual(routes.pop(), ['ServicesTab', { screen: 'ServicesHome' }]);
  shortcut('post'); assert.deepEqual(routes.pop(), ['PostTab', { screen: 'PostMenu' }]);
});

test('uploaded home promotion media contains the original image while other placements retain their fit', () => {
  const hooks = hookRenderer();
  const { load } = loader({ react: hooks.react, mocks: {
    '../hooks/useUIConfig': { useUIConfig: () => ({ locale: 'en' }) },
    './UIVisualAssets': { UIUploadedImage: 'UploadedImage' }, './UILottie': { UILottie: 'Lottie' },
  } });
  const card = load('src/utils/uiHome').defaultHomeCards()[0];
  Object.assign(card.props, { media: 'image', assetId: 'original-promotion', showCopy: true, fit: 'cover' });
  const { UIHomeMedia } = load('src/components/UIHomeMedia');
  const image = () => elements(hooks.render(UIHomeMedia, { card })).find(node => node.type === 'UploadedImage');
  assert.equal(image().props.fit, 'contain');
  assert.equal(image().props.assetId, 'original-promotion');
  card.props.placement = 'aboveTrending';
  assert.equal(image().props.fit, 'cover');
  hooks.dispose();
});

test('native service shortcuts use localized labels and bottom-navigation outline icons in both themes', () => {
  let language = 'en';
  const selected = [];
  const { load } = loader({ mocks: {
    '../../context/AppContext': { useApp: () => ({ t: key => load('src/i18n/translations').translations[language][key] }) },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
  } });
  const { HomeShortcuts } = load('src/screens/offers/HomeShortcuts');
  const theme = load('src/theme');
  for (const mode of ['light', 'dark']) for (const locale of ['en', 'hi']) {
    theme.setThemeMode(mode); language = locale;
    const nodes = elements(HomeShortcuts({ onSelect: key => selected.push(key) }));
    const buttons = nodes.filter(node => node.type === 'Pressable');
    assert.equal(buttons.length, 4);
    assert.ok(buttons.every(node => node.props.accessibilityLabel && node.props.accessibilityState === undefined));
    buttons.forEach(node => node.props.onPress());
    assert.deepEqual(selected.splice(0), ['offers', 'post', 'events', 'services']);
    const icons = nodes.filter(node => node.type === 'Icon');
    assert.deepEqual(icons.map(node => node.props.name), ['home-outline', 'plus-box-outline', 'calendar-month-outline', 'tools']);
    assert.ok(icons.every(node => node.props.color === theme.theme.colors.text));
    assert.equal(buttons[0].props.accessibilityLabel, locale === 'en' ? 'Local Offers' : 'लोकल ऑफ़र');
  }
});

test('manual locality uses server Places without device permission and detects only legacy city pins', async () => {
  const city = { _id: 'pune', name: 'Pune', state: 'Maharashtra', center: { coordinates: [73.8567, 18.5204] } };
  const nigdi = { latitude: 18.6491735, longitude: 73.7706532 };
  let geocodes = 0;
  const { load } = loader({ mocks: {
    './api': {
      placesAutocomplete: async (token, query) => {
        assert.equal(token, 'test-token'); assert.match(query.input, /^Nigdi, Pune/);
        return { data: [{ mainText: 'Nigdi Road', placeId: 'road' }, { mainText: 'Nigdi', placeId: 'area' }] };
      },
      getPlaceLocation: async (_token, id) => { assert.equal(id, 'area'); return { location: nigdi }; },
    },
    'expo-location': { geocodeAsync: async () => { geocodes++; throw new Error('Permission denied'); } },
  } });
  const { resolveManualCoordinates, needsManualLocationRepair } = load('src/services/manualLocation');
  assert.deepEqual(await resolveManualCoordinates(city, 'Nigdi', 'test-token'), nigdi);
  assert.equal(geocodes, 0);
  const old = { city, locality: 'Nigdi', source: 'manual', latitude: 18.5204, longitude: 73.8567 };
  assert.equal(needsManualLocationRepair(old), true);
  assert.equal(needsManualLocationRepair({ ...old, ...nigdi }), false);
  assert.equal(needsManualLocationRepair({ ...old, source: 'gps' }), false);
  assert.equal(needsManualLocationRepair({ ...old, locality: 'Pune' }), false);
});

test('failed manual lookup does not replace an existing locality pin with the city centre', async () => {
  const city = { name: 'Pune', state: 'Maharashtra', center: { coordinates: [73.8567, 18.5204] } };
  const { load } = loader({ mocks: {
    './api': { placesAutocomplete: async () => { throw new Error('Offline'); } },
    'expo-location': { geocodeAsync: async () => { throw new Error('Permission denied'); } },
  } });
  const { resolveManualCoordinates } = load('src/services/manualLocation');
  assert.equal(await resolveManualCoordinates(city, 'Nigdi', 'test-token'), null);
  assert.deepEqual(await resolveManualCoordinates(city, 'Pune'), { longitude: 73.8567, latitude: 18.5204 });
});

test('renderer 5 validates native home placements, media kinds, multiple animations and API parity', () => {
  const { load } = loader();
  const runtime = fixture(load); runtime.rendererVersion = 5;
  const page = runtime.base.pages.offersHome; page.rendererVersion = 5;
  page.slots.beforeContent = load('src/utils/uiHome').defaultHomeCards();
  const image = '507f1f77bcf86cd799439041', animation = '507f1f77bcf86cd799439042';
  runtime.assets[image] = { id: image, kind: 'image', mimeType: 'image/png', sha256: 'a'.repeat(64), width: 100, height: 100, size: 100, fps: 0, duration: 0 };
  runtime.assets[animation] = { id: animation, sha256: 'b'.repeat(64), width: 100, height: 100, size: 100, fps: 30, duration: 1 };
  Object.assign(page.slots.beforeContent[0].props, { media: 'lottie', assetId: animation });
  Object.assign(page.slots.beforeContent[4].props, { media: 'lottie', assetId: animation });
  Object.assign(page.slots.beforeContent[5].props, { media: 'image', assetId: image });
  const parse = load('src/utils/dynamicUI').parseUIRuntime;
  assert.equal(parse(runtime).base.pages.offersHome.slots.beforeContent.length, 7);
  assert.deepEqual(require('../../backend/src/validators/ui.validator').validateConfig(page), page);
  for (const change of [r => { r.base.pages.offersHome.rendererVersion = 4; }, r => { r.assets[animation].kind = 'image'; r.assets[animation].mimeType = 'image/png'; r.assets[animation].fps = 0; r.assets[animation].duration = 0; }, r => { r.base.pages.offersHome.slots.beforeContent[0].props.assetId = 'https://bad.test'; }, r => { r.base.pages.offersHome.slots.beforeContent[0].props.homeAction = 'arbitrary'; }, r => { r.base.pages.offersHome.slots.beforeContent.push({ ...r.base.pages.offersHome.slots.beforeContent[4], id: 'another_banner' }); }]) {
    const invalid = clone(runtime); change(invalid); assert.throws(() => parse(invalid));
  }
});

test('renderer 3 native parser accepts all screen presentations and multiple page assets; rejects cross-screen controls', () => {
  const { load } = loader(); const runtime = fixture(load); runtime.rendererVersion = 3;
  const { UI_PAGE_KEYS } = load('src/types/dynamicUI');
  for (const [index, key] of UI_PAGE_KEYS.entries()) {
    const id = (index + 50).toString(16).padStart(24, '0');
    runtime.assets[id] = { id, sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 1, size: 100 };
    runtime.base.pages[key] = { ...runtime.base.pages[key], rendererVersion: 3, presentation: key === 'offersHome' ? {} : { cardVariant: 'outlined' }, slots: { beforeContent: [{ id: 'animation', type: 'lottie', props: { assetId: id, fallback: { en: 'Welcome' } } }], afterContent: [] } };
  }
  const { parseUIRuntime } = load('src/utils/dynamicUI');
  assert.equal(Object.keys(parseUIRuntime(runtime).assets).length, 13);
  for (const [key, fields] of [['plans', { amount: 1 }], ['otp', { enabled: false }], ['serviceProviders', { planLayout: 'compact' }]]) { const invalid = clone(runtime); invalid.base.pages[key].presentation = fields; assert.throws(() => parseUIRuntime(invalid)); }
});

test('shared renderer safely renders decorations across all screens and bundled artwork has no URL input', () => {
  let config;
  const { load, native } = loader({ mocks: { '../hooks/useUIConfig': { useUIConfig: () => ({ state: { config }, locale: 'en' }) }, './OfferCard': { OfferCard: 'OfferCard' }, './UILottie': { UILottie: 'Lottie' }, '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme } } });
  native.Image = 'Image'; config = fixture(load); config.rendererVersion = 3;
  const { DynamicRenderer } = load('src/components/DynamicRenderer');
  for (const key of load('src/types/dynamicUI').UI_PAGE_KEYS) {
    config.base.pages[key].slots.beforeContent = [{ id: 'image', type: 'illustration', props: { image: 'business', alt: { en: 'Community' } } }];
    const tree = DynamicRenderer({ pageKey: key, slot: 'beforeContent' });
    const image = tree.props.children[0].props.children;
    assert.equal(image.type(image.props).props.source, 1);
  }
  assert.equal(load('src/utils/uiIllustrations').uiIllustration('https://bad.test'), undefined);
});

test('Services filtering, verified badges and Call/WhatsApp/Share retain native API data and handlers', async () => {
  const records = [{ _id: 'one', name: 'Alice', phone: '9876543210', whatsapp: '9876543210', verificationStatus: 'verified', ratingCount: 0 }, { _id: 'two', name: 'Bob', phone: '', verificationStatus: 'pending', ratingCount: 0 }];
  const requests = []; const h = nativeScreen({ api: { listServiceProviders: async (...args) => { requests.push(args); return { data: records }; } }, options: { providerVariant: 'compact' } });
  const Component = h.load('src/screens/services/ServiceProvidersScreen').ServiceProvidersScreen;
  const props = { route: { params: { cityId: 'city', categoryId: 'category', categoryName: 'Plumber', locality: 'Central', cityName: 'Town' } }, navigation: { goBack() {} } };
  h.render(Component, props); await tick(); let nodes = elements(h.render(Component, props));
  assert.deepEqual(requests, [['city', 'category', 'Central']]);
  const list = nodes.find((node) => node.type === 'FlatList'); assert.equal(list.props.data.length, 2);
  const item = list.props.renderItem({ item: records[0] }); const card = item.type(item.props);
  assert.ok(elements(card).some((node) => node.props?.accessibilityLabel === 'Verified provider'));
  for (const button of elements(card).filter((node) => typeof node.type === 'function' && node.props?.label)) { const control = button.type(button.props); await control.props.onPress(); }
  assert.ok(h.calls.some((call) => call[0] === 'link' && call[1] === 'tel:9876543210'));
  assert.ok(h.calls.some((call) => call[0] === 'link' && call[1].startsWith('https://wa.me/919876543210')));
  assert.ok(h.calls.some((call) => call[0] === 'share'));
  nodes.find((node) => node.type === 'ServiceSearch').props.onChangeText('alice');
  assert.deepEqual(elements(h.render(Component, props)).find((node) => node.type === 'FlatList').props.data.map((row) => row._id), ['one']);
});

test('Services home retains city/locality selection, area search and native navigation', async () => {
  const selected = [], routes = [];
  const city = { _id: 'city', name: 'Town', servicesEnabled: true, localities: ['North', 'South'] };
  const h = nativeScreen({ api: { listSupportedCities: async () => ({ data: [city] }) }, mocks: {
    '../../hooks/useHyperlocalLocation': { useHyperlocalLocation: () => ({ cities: [city], location: { city, locality: 'North' }, savedLocations: [], refreshStoredLocation: async () => {}, chooseManual: async (...args) => selected.push(args), setPickerVisible() {} }) },
    '../../navigation/hideTabBarOnScroll': { tabBarScrollProps: {} },
  } });
  const Component = h.load('src/screens/services/ServicesHomeScreen').ServicesHomeScreen;
  const props = { navigation: { navigate: (...args) => routes.push(args) } };
  h.render(Component, props); await tick(); let nodes = elements(h.render(Component, props));
  assert.equal(nodes.find((node) => node.type === 'CityPicker').props.cities[0], city);
  nodes.find((node) => node.type === 'ServiceSearch').props.onChangeText('south');
  nodes = elements(h.render(Component, props));
  const areas = nodes.filter((node) => node.props?.area && !node.props.recent);
  assert.deepEqual(areas.map((node) => node.props.area), ['South']);
  areas[0].props.onPress(); await tick();
  assert.deepEqual(selected, [[city, 'South']]);
  assert.deepEqual(routes, [['ServiceCategories', { cityId: 'city', cityName: 'Town', locality: 'South' }]]);
});

test('category grid variants retain city filters, emergency search and provider navigation', async () => {
  const routes = [], requests = [];
  const records = [{ _id: 'plumber', name: 'Plumber' }, { _id: 'police', name: 'Police' }];
  const h = nativeScreen({ api: { listServiceCategories: async (city) => { requests.push(city); return { data: records }; } }, options: { categoryLayout: 'threeColumns' } });
  const Component = h.load('src/screens/services/ServiceCategoriesScreen').ServiceCategoriesScreen;
  const props = { route: { params: { cityId: 'city', cityName: 'Town', locality: 'Central' } }, navigation: { navigate: (...args) => routes.push(args), goBack() {} } };
  h.render(Component, props); await tick(); let nodes = elements(h.render(Component, props));
  let list = nodes.find((node) => node.type === 'FlatList');
  assert.deepEqual(requests, ['city']); assert.equal(list.props.numColumns, 3);
  list.props.renderItem({ item: records[0], index: 0 }).props.onPress();
  assert.deepEqual(routes[0], ['ServiceProviders', { cityId: 'city', cityName: 'Town', locality: 'Central', categoryId: 'plumber', categoryName: 'Plumber' }]);
  elements(list.props.ListHeaderComponent).find((node) => node.props?.accessibilityLabel === 'Show local emergency contacts').props.onPress();
  list = elements(h.render(Component, props)).find((node) => node.type === 'FlatList');
  assert.deepEqual(list.props.data.map((row) => row._id), ['police']);
  nodes = elements(h.render(Component, props)); nodes.find((node) => node.type === 'ServiceSearch').props.onChangeText('plumber');
  assert.equal(elements(h.render(Component, props)).find((node) => node.type === 'FlatList').props.data.length, 0);
});

test('plan presentation sends the exact API plan and business to the existing payment sheet', async () => {
  const plan = { _id: 'plan', name: 'API plan', description: 'Plan description', price: 499, billingPeriod: 'month', offerPostingLimit: 3, maximumActiveOffers: 2, imagesPerOffer: 1, featuredOfferAllowance: 0 };
  const h = nativeScreen({ api: { listPlans: async () => ({ data: [plan] }), listMyBusinesses: async () => ({ data: [{ _id: 'business', name: 'Shop', verificationStatus: 'verified' }] }) }, options: { planLayout: 'compact' } });
  const Component = h.load('src/screens/post/PlansScreen').PlansScreen, props = { route: { params: {} }, navigation: { goBack() {} } };
  h.render(Component, props); await tick(); let nodes = elements(h.render(Component, props));
  nodes.find((node) => node.type === 'Button' && node.props.label === 'Choose Plan').props.onPress();
  const sheet = elements(h.render(Component, props)).find((node) => node.type === 'PaymentSheet');
  assert.equal(sheet.props.plan, plan); assert.equal(sheet.props.plan.price, 499); assert.equal(sheet.props.businessId, 'business'); assert.equal(sheet.props.visible, true);
});

test('Business Center never exposes approved-business actions for pending/rejected profiles', () => {
  for (const status of ['pending', 'rejected', 'verified']) {
    const h = nativeScreen({ app: { businesses: [{ _id: 'business', name: 'Shop', verificationStatus: status }], businessAccessLoading: false }, options: { dashboardVariant: 'compact', statusVariant: 'outlined' } });
    const Component = h.load('src/screens/more/BusinessCenterScreen').BusinessCenterScreen;
    const nodes = elements(h.render(Component, { navigation: { navigate() {}, goBack() {} } }));
    const labels = nodes.filter((node) => node.type === 'Button').map((node) => node.props.label);
    assert.equal(labels.includes('Choose plan'), status === 'verified'); assert.equal(labels.includes('My offers'), false);
    assert.equal(labels.includes('Update & resubmit'), status === 'rejected');
  }
});

test('OTP length, resend cooldown and confirmation remain enforced by the native screen', async () => {
  const verified = []; const h = nativeScreen({ app: { authIdentifierValue: '+919876543210', authIdentifierType: 'phone', confirmOtp: async (code) => verified.push(code), requestOtp: async () => ({ demoOtp: '9999' }) } });
  const Component = h.load('src/screens/auth/OtpVerificationScreen').OtpVerificationScreen;
  const props = { route: { params: { demoOtp: '1234' } }, navigation: { goBack() {}, navigate() {} } };
  let nodes = elements(h.render(Component, props));
  assert.equal(nodes.find((node) => node.type === 'Button').props.disabled, true);
  assert.ok(nodes.some((node) => node.type === 'Text' && elements(node).length === 1 && String(node.props.children).includes('Resend OTP in')));
  nodes.find((node) => node.type === 'TextInput').props.onChangeText('1a23456');
  nodes = elements(h.render(Component, props)); const button = nodes.find((node) => node.type === 'Button');
  assert.equal(button.props.disabled, false); await button.props.onPress(); assert.deepEqual(verified, ['1234']);
});

test('registration requires local terms acceptance and retains validation/navigation', async () => {
  const registered = [], routes = []; const h = nativeScreen({ app: { startRegistration: async (...args) => { registered.push(args); return { demoOtp: '1234' }; } } });
  const Component = h.load('src/screens/auth/ProfileSetupScreen').ProfileSetupScreen, props = { route: { params: {} }, navigation: { navigate: (...args) => routes.push(args), goBack() {} } };
  let nodes = elements(h.render(Component, props));
  for (const [label, value] of [['Full name', 'Alice'], ['Phone number', '9876543210'], ['Password', 'StrongPass9!']]) nodes.find((node) => node.type === 'Input' && node.props.label === label).props.onChangeText(value);
  nodes = elements(h.render(Component, props)); await nodes.find((node) => node.type === 'Button' && node.props.label === 'Send OTP').props.onPress();
  assert.equal(registered.length, 0);
  nodes.find((node) => node.props?.accessibilityRole === 'checkbox').props.onPress();
  nodes = elements(h.render(Component, props)); await nodes.find((node) => node.type === 'Button' && node.props.label === 'Send OTP').props.onPress();
  assert.equal(registered.length, 1); assert.equal(registered[0][1].termsAccepted, true); assert.equal(routes[0][0], 'OtpVerification');
});

test('Offer Details keeps eligibility failures closed and uses native contact/save/share routes', async () => {
  const routes = [], events = [];
  const offer = { _id: 'offer', title: 'API offer', description: 'Description', originalPrice: 200, offerPrice: 100, discountPercentage: 50, phone: '9876543210', whatsapp: '9876543210', startsAt: new Date(TIME).toISOString(), expiresAt: new Date(TIME + 86400_000).toISOString(), address: 'Central', location: { coordinates: [77, 28] }, business: { _id: 'shop', name: 'Shop', verificationStatus: 'verified' } };
  const saved = [];
  const api = { getOfferDetails: async () => ({ offer }), listSavedOffers: async () => ({ data: [] }), recordOfferEvent: async (...args) => events.push(args), toggleSavedOffer: async (...args) => { saved.push(args); return { saved: true }; }, submitReport: async () => ({}) };
  const h = nativeScreen({ api, options: { posterVariant: 'contained', detailsVariant: 'stacked' } });
  const Component = h.load('src/screens/offers/OfferDetailsScreen').OfferDetailsScreen;
  const props = { route: { params: { offerId: 'offer' } }, navigation: { goBack() {}, navigate: (...args) => routes.push(args) } };
  h.render(Component, props); await tick(); let nodes = elements(h.render(Component, props));
  assert.equal(nodes.find((node) => node.type === 'OfferArtwork').props.offer, offer);
  await nodes.find((node) => node.props?.accessibilityLabel === 'Grab this offer').props.onPress();
  assert.ok(h.calls.some((call) => call[0] === 'contact' && call[1] === 'tel:9876543210'));
  const actions = nodes.filter((node) => node.type === 'RoundAction');
  await actions.find((node) => node.props.label === 'WhatsApp').props.onPress();
  await actions.find((node) => node.props.label === 'Directions').props.onPress();
  await actions.find((node) => node.props.label === 'Save').props.onPress();
  assert.deepEqual(saved, [['test-token', 'offer']]);
  assert.ok(h.calls.some((call) => call[0] === 'contact' && call[1].includes('destination=28,77')));
  await nodes.find((node) => node.props?.accessibilityLabel === 'Share offer').props.onPress();
  assert.ok(events.some((event) => event[1] === 'share'));
  const rejected = nativeScreen({ api: { getOfferDetails: async () => { throw new Error('Offer ineligible'); }, listSavedOffers: async () => ({ data: [] }) } });
  const Rejected = rejected.load('src/screens/offers/OfferDetailsScreen').OfferDetailsScreen;
  rejected.render(Rejected, props); await tick(); nodes = elements(rejected.render(Rejected, props));
  assert.equal(nodes.some((node) => node.type === 'OfferArtwork' || node.props?.accessibilityLabel === 'Grab this offer'), false);
});

test('More and Profile retain trusted destinations, business gates and logout confirmation', () => {
  const routes = []; let loggedOut = 0;
  for (const approved of [false, true]) {
    const h = nativeScreen({ app: { hasApprovedBusiness: approved, businesses: [], currentUser: { name: 'Alice' }, logout: () => loggedOut++ }, options: { menuVariant: 'separated' } });
    const navigation = { navigate: (...args) => routes.push(args), goBack() {}, canGoBack: () => true };
    const More = h.load('src/screens/more/MoreScreen').MoreScreen;
    const tree = h.render(More, { navigation });
    const labels = elements(tree).filter((node) => node.props?.accessibilityLabel).map((node) => node.props.accessibilityLabel);
    assert.equal(labels.includes('subscriptionPlans'), approved);
    const Profile = h.load('src/screens/profile/ProfileScreen').ProfileScreen;
    const profile = h.render(Profile, { navigation });
    const menu = elements(profile).find((node) => typeof node.type === 'function' && node.props?.title === 'logout');
    const control = menu.type(menu.props); control.props.onPress();
    assert.equal(loggedOut, approved ? 1 : 0);
    const prompt = h.calls.find((call) => call[0] === 'alert' && call[1] === 'logoutQuestion');
    prompt[3].find((item) => item.style === 'destructive').onPress();
  }
  assert.equal(loggedOut, 2);
});

test('native login and onboarding render with their controls and stable local slide navigation', () => {
  const navigation = { navigate() {}, replace() {}, goBack() {} };
  const login = nativeScreen();
  const Login = login.load('src/screens/auth/PhoneEntryScreen').PhoneEntryScreen;
  const loginNodes = elements(login.render(Login, { navigation }));
  assert.ok(loginNodes.some((node) => node.type === 'TextInput'));
  assert.ok(loginNodes.some((node) => node.type === 'DynamicSlot' && node.props.pageKey === 'login'));
  const onboarding = nativeScreen();
  const Onboarding = onboarding.load('src/screens/auth/OnboardingScreen').OnboardingScreen;
  onboarding.render(Onboarding, { navigation, route: { params: { force: true } } });
  onboarding.slots[1] = false;
  const slides = elements(onboarding.render(Onboarding, { navigation, route: { params: { force: true } } })).filter((node) => node.props?.pageIndex !== undefined);
  assert.equal(slides.length, 3);
  assert.deepEqual(slides.map((slide) => slide.props.pageIndex), [0, 1, 2]);
  assert.ok(slides.every((slide) => typeof slide.props.onNext === 'function' && typeof slide.props.onSkip === 'function'));
});

test('presentation hook returns native defaults on fallback, localizes copy and reads one shared store', () => {
  let state; const react = { ...React, useMemo: (work) => work() };
  const { load } = loader({ react, mocks: { './useUIConfig': { useUIConfig: () => ({ state, locale: 'hi' }) }, '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme } } });
  const hook = load('src/hooks/useUIPage').useUIPage;
  state = { config: fixture(load) };
  state.config.rendererVersion = 3; state.config.base.pages.plans.rendererVersion = 3;
  state.config.base.pages.plans.presentation = { planLayout: 'compact', promotionalLabel: { en: 'Seasonal plans', hi: 'Festival plans' } };
  assert.equal(hook('plans').option('planLayout'), 'compact'); assert.equal(hook('plans').copy('promotionalLabel', 'Default'), 'Festival plans');
  state.config.useNativeFallback = true; state.config.enabled = false;
  assert.equal(hook('plans').option('planLayout'), 'default'); assert.deepEqual(hook('plans').card, {});
});

function campaignFixture(load, duration = 30_000) {
  const runtime = fixture(load);
  runtime.nextTransitionAt = new Date(TIME + duration).toISOString();
  runtime.refreshAfter = runtime.nextTransitionAt;
  runtime.validUntil = runtime.nextTransitionAt;
  runtime.campaign = { id: '000000000000000000000010', identifier: 'festival-test', version: 1, releaseId: '000000000000000000000002', startsAt: new Date(TIME - 1000).toISOString(), endsAt: runtime.nextTransitionAt };
  return runtime;
}

test('campaign parser rejects expired, future, unsafe and overlong campaign leases', () => {
  const { load } = loader();
  const { parseUIRuntime } = load('src/utils/dynamicUI');
  const body = campaignFixture(load);
  assert.equal(parseUIRuntime(body).campaign.identifier, 'festival-test');
  for (const mutate of [
    (value) => { value.campaign.endsAt = value.serverTime; },
    (value) => { value.campaign.startsAt = value.validUntil; },
    (value) => { value.validUntil = new Date(TIME + 60_000).toISOString(); },
    (value) => { value.campaign.roles = ['admin']; },
    (value) => { value.nextTransitionAt = value.serverTime; },
  ]) { const value = clone(body); mutate(value); assert.throws(() => parseUIRuntime(value)); }
});

test('offline campaign expires exactly at its boundary and remains expired after restart', async () => {
  const { load } = loader();
  const rows = storage(); let time = TIME, offline = false;
  const body = campaignFixture(load);
  const fetchRuntime = async () => { if (offline) throw new Error('Offline'); return response(body); };
  const store = makeStore(load, rows, fetchRuntime, { now: () => time });
  await store.start(); await store.flushCache();
  assert.equal(store.nextRefreshDelay(), 30_000);
  offline = true; time += 29_999;
  await store.refresh(); assert.ok(store.getSnapshot().config.campaign);
  time += 1; store.expire();
  assert.equal(store.getSnapshot().config.useNativeFallback, true);
  await store.refresh(); assert.equal(store.getSnapshot().config.campaign, undefined);
  store.stop();
  const restarted = makeStore(load, rows, fetchRuntime, { now: () => time });
  await restarted.start(); assert.equal(restarted.getSnapshot().config.useNativeFallback, true);
  restarted.stop();
});

test('304 never slides activation/expiry deadlines or extends a campaign indefinitely', async () => {
  const { load } = loader(); let time = TIME, count = 0;
  const store = makeStore(load, storage(), async () => ++count === 1 ? response(campaignFixture(load)) : { status: 304, etag: 'W/"release"', serverDate: new Date(time).toUTCString() }, { now: () => time });
  await store.start();
  time += 20_000; await store.refresh();
  assert.equal(store.getSnapshot().config.validUntil, new Date(TIME + 30_000).toISOString());
  assert.equal(store.nextRefreshDelay(), 10_000);
  time += 10_000; store.expire();
  assert.equal(store.getSnapshot().config.useNativeFallback, true);
  store.stop();
});

test('city-scoped stores isolate caches and transmit the selected city', async () => {
  const { load } = loader(); const rows = storage();
  const city = '507f1f77bcf86cd799439012';
  const selected = makeStore(load, rows, async (request) => { assert.equal(request.cityId, city); return response(campaignFixture(load)); }, { scope: `https://ui.test:city:${city}`, cityId: city });
  await selected.start(); await selected.flushCache(); selected.stop();
  const other = makeStore(load, rows, async () => { throw new Error('Offline'); }, { scope: 'https://ui.test:city:all' });
  await other.start(); assert.equal(other.getSnapshot().source, 'default'); other.stop();
  const same = makeStore(load, rows, async () => { throw new Error('Offline'); }, { scope: `https://ui.test:city:${city}`, cityId: city });
  await same.start(); assert.equal(same.getSnapshot().source, 'cache'); same.stop();
});

test('slow or already expired HTTP responses cannot restart a campaign lease', async () => {
  const { load } = loader(); let time = TIME;
  const store = makeStore(load, storage(), async () => { time += 31_000; return response(campaignFixture(load)); }, { now: () => time });
  await store.start(); assert.equal(store.getSnapshot().source, 'default'); store.stop();
});

test('replayed campaign 200s cannot extend expiry during a session or after an expired-cache restart', async () => {
  const { load } = loader(); const rows = storage(); let time = TIME;
  const stale = async () => response(campaignFixture(load));
  const store = makeStore(load, rows, stale, { now: () => time });
  await store.start(); await store.flushCache();
  time += 20_000; await store.refresh();
  assert.equal(store.nextRefreshDelay(), 10_000);
  await store.flushCache();
  time += 10_000; store.expire(); await store.refresh();
  assert.equal(store.getSnapshot().config.useNativeFallback, true); store.stop();
  const restarted = makeStore(load, rows, stale, { now: () => time });
  await restarted.start(); assert.equal(restarted.getSnapshot().config.useNativeFallback, true); restarted.stop();
});

test('HTTP cache Age consumes the campaign lease even on first launch', async () => {
  const { load } = loader();
  const store = makeStore(load, storage(), async () => ({ ...response(campaignFixture(load)), serverAgeMs: 31_000 }));
  await store.start(); assert.equal(store.getSnapshot().config.useNativeFallback, true); store.stop();
});

test('runtime parser matches Phase 2 defaults and rejects incompatible/unsafe configuration', () => {
  const { load } = loader();
  const { parseUIRuntime, parseUIBlock } = load('src/utils/dynamicUI');
  const runtime = fixture(load);
  const backend = require('../../backend/src/validators/ui.validator');
  runtime.base = backend.defaultBase();
  assert.equal(parseUIRuntime(runtime).generation, 1);
  assert.ok(Object.isFrozen(parseUIRuntime(runtime).base.pages.offersHome));
  for (const change of [
    (r) => { r.schemaVersion = 2; }, (r) => { r.rendererVersion = 7; }, (r) => { r.overlay = {}; },
    (r) => { delete r.base.pages.login; }, (r) => { r.assets.file = 'remote'; },
    (r) => { r.base.theme.modes.light.colors.text = '#FFFFFF'; },
    (r) => { r.base.theme.modes.dark.colors.secondary = '#112233'; },
    (r) => { r.base.pages.offersHome.slots.beforeContent = [{ id: 'bad', type: 'webview', props: {} }]; },
    (r) => { r.base.pages.offersHome.slots.beforeContent = [{ id: 'bad', type: 'text', props: { text: { en: '<script>bad()</script>' } } }]; },
    (r) => { r.base.pages.offersHome.slots.beforeContent = [{ id: 'bad', type: 'spacer', props: { height: 49 } }]; },
    (r) => { r.base.pages.login.slots.beforeContent = [{ id: 'link', type: 'actionLink', props: { label: { en: 'Go' }, action: 'business.openCenter' } }]; },
  ]) { const value = clone(runtime); change(value); assert.throws(() => parseUIRuntime(value)); }
  assert.equal(parseUIBlock({ id: 'bad', type: 'text', props: JSON.parse('{"text":{"en":"Hello"},"__proto__":{"polluted":true}}') }, 'offersHome'), null);
  const blocks = [
    { id: 'text', type: 'text', props: { text: { en: 'Hello', hi: 'Namaste' }, variant: 'heading' } },
    { id: 'hero', type: 'heroBanner', props: { title: { en: 'Local offers' }, buttonLabel: { en: 'View' }, action: 'offers.openAll' } },
    { id: 'rail', type: 'offerRail', props: { source: 'nearby', limit: 4, variant: 'compact' } },
    { id: 'space', type: 'spacer', props: { height: 16 } },
    { id: 'link', type: 'actionLink', props: { label: { en: 'Settings' }, action: 'profile.openSettings' } },
  ];
  runtime.base.pages.offersHome.slots.beforeContent = blocks;
  assert.deepEqual(parseUIRuntime(runtime).base.pages.offersHome.slots.beforeContent, blocks);
  assert.doesNotThrow(() => backend.validateConfig(runtime.base.pages.offersHome));
});

test('production API selection ignores Metro metadata and unsafe explicit origins', () => {
  const api = (expoConfig, dev = false) => loader({ dev, mocks: { 'expo-constants': { expoConfig } } }).load('src/services/api');
  const production = 'https://app-api.inquiry.business';
  assert.equal(api({ hostUri: '192.0.2.8:8081' }).API_BASE_URL, production);
  for (const apiBaseUrl of ['http://192.0.2.8:5000', 'http://localhost:5000', 'https://127.0.0.1', 'https://192.168.1.9', 'https://user:password@example.test', 'invalid']) {
    assert.equal(api({ extra: { apiBaseUrl } }).API_BASE_URL, production);
  }
  assert.equal(api({ extra: { apiBaseUrl: 'https://staging.example.test/' } }).API_BASE_URL, 'https://staging.example.test');
  assert.equal(api({ hostUri: '192.0.2.8:8081' }, true).API_BASE_URL, 'http://192.0.2.8:5000');
  assert.equal(api({ extra: { apiBaseUrl: 'http://127.0.0.1:5000' } }, true).API_BASE_URL, 'http://127.0.0.1:5000');
});

test('transport reuses the API URL, sends ETags, treats 304 as bodyless and leaves auth/loading hooks untouched', async () => {
  const requests = [];
  let status = 200;
  const { load } = loader({ fetch: async (url, options) => {
    requests.push({ url, options });
    return { status, headers: new Headers({ ETag: 'W/"v1"', Date: new Date(TIME).toUTCString() }),
      text: async () => { assert.notEqual(status, 304); return JSON.stringify(fixture(load)); },
      json: async () => ({ success: true, existingEndpoint: true }), ok: status === 200 };
  } });
  const api = load('src/services/api');
  let hooks = 0;
  api.setAuthTokens({ accessToken: 'private', refreshToken: 'private' });
  api.setRequestLifecycleHandlers({ onRequestStart: () => hooks++, onRequestEnd: () => hooks++ });
  assert.equal((await api.fetchUIRuntime({ locale: 'hi' })).status, 200);
  assert.equal(requests[0].url, 'https://ui.test/ui/runtime?rendererVersion=6&locale=hi&campaignVersion=1');
  assert.equal(requests[0].options.headers.Authorization, undefined);
  status = 304;
  const cached = await api.fetchUIRuntime({ locale: 'hi', etag: 'W/"v1"' });
  assert.equal(cached.status, 304);
  assert.equal(requests[1].options.headers['If-None-Match'], 'W/"v1"');
  assert.equal(hooks, 0);
  status = 200;
  assert.deepEqual(await api.request('/health'), { success: true, existingEndpoint: true });
  assert.equal(hooks, 2);
});

test('transport bounds HTTP errors, malformed JSON, oversized responses, timeouts and cancellation', async () => {
  for (const fetch of [
    async () => ({ status: 404, headers: new Headers() }),
    async () => ({ status: 200, headers: new Headers(), text: async () => '{bad' }),
    async () => ({ status: 200, headers: new Headers({ 'Content-Length': String(300000) }), text: async () => { assert.fail('Oversized body must not be read'); } }),
  ]) await assert.rejects(loader({ fetch }).load('src/services/api').fetchUIRuntime({ locale: 'en' }));
  let abortedSignal;
  const api = loader({ fetch: (_url, options) => { abortedSignal = options.signal; return new Promise(() => {}); } }).load('src/services/api');
  await assert.rejects(api.fetchUIRuntime({ locale: 'en', timeoutMs: 15 }), { code: 'UI_RUNTIME_TIMEOUT' });
  assert.equal(abortedSignal.aborted, true);
  const controller = new AbortController();
  const request = api.fetchUIRuntime({ locale: 'en', signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { code: 'UI_RUNTIME_ABORTED' });
});

test('store deduplicates concurrent requests and tracks only validated published versions', async () => {
  const { load } = loader();
  const saved = storage();
  let resolve;
  let count = 0;
  const store = makeStore(load, saved, () => { count++; return new Promise((done) => { resolve = done; }); });
  const started = store.start();
  await tick();
  const one = store.refresh(); const two = store.refresh();
  assert.equal(one, two);
  assert.equal(count, 1);
  resolve(response(fixture(load, 3), 'W/"v3"'));
  await Promise.all([started, one, two]);
  await store.flushCache();
  assert.equal(store.getSnapshot().config.generation, 3);
  assert.equal(store.getSnapshot().etag, 'W/"v3"');
  assert.equal(saved.rows.size, 1);
  store.stop();
});

test('304 reuses validated content and renews cache age using the HTTP Date header', async () => {
  const { load } = loader();
  let time = TIME;
  const calls = [];
  const store = makeStore(load, storage(), async (options) => {
    calls.push(options);
    return calls.length === 1 ? response(fixture(load, 2), 'W/"v2"')
      : { status: 304, etag: 'W/"v2"', serverDate: new Date(time).toUTCString() };
  }, { now: () => time });
  await store.start();
  time += 120_000;
  await store.refresh();
  const state = store.getSnapshot();
  assert.equal(calls[1].etag, 'W/"v2"');
  assert.equal(Date.parse(state.config.serverTime), time);
  assert.equal(Date.parse(state.config.validUntil), time + 7 * 86400_000);
  assert.equal(state.config.generation, 2);
  assert.equal(state.error, null);
  store.stop();
});

test('304 without a matching cache retries once unconditionally', async () => {
  const { load } = loader();
  const options = [];
  const store = makeStore(load, storage(), async (request) => {
    options.push(request);
    return options.length === 1 ? { status: 304, etag: 'W/"missing"', serverDate: null } : response(fixture(load));
  });
  await store.start();
  assert.equal(options.length, 2);
  assert.equal(options[1].etag, undefined);
  assert.equal(store.getSnapshot().config.enabled, true);
  store.stop();
});

test('offline startup restores last-known-good configuration and storage failures cannot block startup', async () => {
  const { load } = loader();
  const saved = storage();
  const first = makeStore(load, saved, async () => response(fixture(load, 4)));
  await first.start(); await first.flushCache(); first.stop();
  const offline = makeStore(load, saved, async () => { throw new Error('Offline'); });
  await offline.start();
  assert.equal(offline.getSnapshot().source, 'cache');
  assert.equal(offline.getSnapshot().config.generation, 4);
  assert.ok(offline.getSnapshot().error);
  const blockedStorage = { getItem: async () => { throw new Error('Storage unavailable'); }, removeItem: async () => { throw new Error('Storage unavailable'); }, setItem: async () => { throw new Error('Storage unavailable'); } };
  const fresh = makeStore(load, blockedStorage, async () => response(fixture(load, 5)));
  await fresh.start(); await fresh.flushCache();
  assert.equal(fresh.getSnapshot().config.generation, 5);
  offline.stop(); fresh.stop();
});

test('corrupt, incompatible and expired caches recover to defaults without crashing', async () => {
  const { load } = loader();
  const saved = storage();
  const first = makeStore(load, saved, async () => response(fixture(load)));
  await first.start(); await first.flushCache(); first.stop();
  const [key, original] = [...saved.rows][0];
  for (const raw of ['{bad', JSON.stringify({ ...JSON.parse(original), version: 2 }), JSON.stringify({ ...JSON.parse(original), scope: 'https://other.test' })]) {
    saved.rows.set(key, raw);
    const store = makeStore(load, saved, async () => { throw new Error('Offline'); });
    await store.start(); await store.flushCache();
    assert.equal(store.getSnapshot().source, 'default');
    assert.equal(store.getSnapshot().config.useNativeFallback, true);
    store.stop();
  }
  saved.rows.set(key, original);
  const expired = makeStore(load, saved, async () => { throw new Error('Offline'); }, { now: () => TIME + 8 * 86400_000 });
  await expired.start();
  assert.equal(expired.getSnapshot().source, 'default');
  expired.stop();
});

test('locale hydration can restore an offline cache, while a delayed read cannot replace a newer response', async () => {
  const { load } = loader();
  const saved = storage();
  const first = makeStore(load, saved, async () => response(fixture(load, 4)));
  await first.start(); await first.flushCache(); first.stop();
  const original = [...saved.rows.values()][0];
  let finishRead;
  const delayed = { ...saved, getItem: () => new Promise((resolve) => { finishRead = resolve; }) };
  const offline = makeStore(load, delayed, () => { throw new Error('Offline'); });
  const started = offline.start();
  await offline.setLocale('hi');
  finishRead(original);
  await started;
  assert.equal(offline.getSnapshot().source, 'cache');
  assert.equal(offline.getSnapshot().config.generation, 4);
  assert.equal(offline.getSnapshot().etag, null);
  // A synchronous adapter failure must also clear the shared request slot.
  await offline.refresh();
  assert.equal(offline.getSnapshot().loading, false);
  offline.stop();

  const newer = makeStore(load, delayed, async () => response(fixture(load, 5)));
  const reading = newer.start();
  await newer.refresh();
  finishRead(original);
  await reading;
  assert.equal(newer.getSnapshot().config.generation, 5);
  assert.equal(newer.getSnapshot().source, 'network');
  newer.stop();
});

test('invalid responses retain the valid cache; explicit native fallback directives replace it', async () => {
  const { load } = loader();
  const saved = storage();
  let next = response(fixture(load, 5));
  const store = makeStore(load, saved, async () => next);
  await store.start();
  next = response({ schemaVersion: 7 });
  await store.refresh();
  assert.equal(store.getSnapshot().config.generation, 5);
  next = response({ ...fixture(load, 5), enabled: false, useNativeFallback: true, fallbackReason: 'disabled' });
  await store.refresh(); await store.flushCache(); store.stop();
  const offline = makeStore(load, saved, async () => { throw new Error('Offline'); });
  await offline.start();
  assert.equal(offline.getSnapshot().config.fallbackReason, 'disabled');
  offline.stop();
});

test('late requests, stale generations and conflicting release identities cannot overwrite newer configuration', async () => {
  const { load } = loader();
  const completions = [];
  const store = makeStore(load, storage(), () => new Promise((resolve) => { completions.push(resolve); }));
  const starting = store.start(); await tick();
  const newer = store.setLocale('hi');
  completions[1](response(fixture(load, 3))); await newer;
  completions[0](response(fixture(load, 20))); await starting;
  assert.equal(store.getSnapshot().config.generation, 3);
  const stale = store.refresh(); completions[2](response(fixture(load, 2))); await stale;
  assert.equal(store.getSnapshot().config.generation, 3);
  const conflicting = store.refresh(); completions[3](response({ ...fixture(load, 3), releaseId: 'ffffffffffffffffffffffff' })); await conflicting;
  assert.equal(store.getSnapshot().config.releaseId, fixture(load, 3).releaseId);
  store.stop();
});

test('stop/restart ignores old requests and remains safe under provider effect remounts', async () => {
  const { load } = loader();
  const completions = [];
  const store = makeStore(load, storage(), () => new Promise((resolve) => { completions.push(resolve); }));
  const old = store.start(); await tick(); store.stop();
  const fresh = store.start(); await tick();
  completions[1](response(fixture(load, 2))); await fresh;
  completions[0](response(fixture(load, 9))); await old;
  assert.equal(store.getSnapshot().config.generation, 2);
  store.stop();
});

test('theme overrides invalidate same-mode style caches and preserve bundled typography/geometry/secondary colors', () => {
  const { load } = loader();
  const runtime = load('src/theme/runtime');
  const { theme } = load('src/theme/index');
  const sheet = runtime.createThemedStyles((colors) => ({ card: { backgroundColor: colors.surface, borderColor: colors.primary } }));
  const original = sheet.card;
  const secondary = theme.colors.secondary;
  const geometry = { spacing: theme.spacing, radius: theme.radius, typography: theme.typography };
  let notifications = 0;
  const unsubscribe = runtime.subscribeToThemeRevision(() => notifications++);
  const modes = { light: { colors: { primary: '#123456', secondary: '#FF0000' } }, dark: { colors: { primary: '#345678', surface: '#102030', unknown: '#FF0000' } } };
  runtime.setThemeOverrides(modes);
  assert.equal(runtime.getThemeMode(), 'dark');
  assert.equal(theme.colors.primary, '#345678');
  assert.equal(sheet.card.backgroundColor, '#102030');
  assert.notEqual(sheet.card, original);
  assert.equal(theme.colors.secondary, secondary);
  assert.deepEqual({ spacing: theme.spacing, radius: theme.radius, typography: theme.typography }, geometry);
  runtime.setThemeOverrides(modes);
  assert.equal(notifications, 1);
  runtime.setThemeMode('light');
  assert.equal(theme.colors.primary, '#123456');
  runtime.setThemeOverrides(null);
  assert.equal(theme.colors.primary, '#118F91');
  unsubscribe();
});

test('registry renders only validated blocks in configured order with stable keys and trusted callbacks', () => {
  let state;
  let calls = 0;
  const { load } = loader({ mocks: {
    '../hooks/useUIConfig': { useUIConfig: () => ({ state, locale: 'hi' }) },
    '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme },
    './OfferCard': { OfferCard: () => null },
  } });
  const config = fixture(load);
  const blocks = [
    { id: 'heading', type: 'text', props: { text: { en: 'Local offers', hi: 'Namaste' }, variant: 'heading' } },
    { id: 'hero', type: 'heroBanner', props: { title: { en: 'Hello' }, buttonLabel: { en: 'View' }, action: 'offers.openAll' } },
    { id: 'space', type: 'spacer', props: { height: 16 } },
    { id: 'unsafe', type: 'webview', props: { code: 'bad()' } },
  ];
  config.base.pages.offersHome.slots.beforeContent = blocks;
  state = { config };
  const { DynamicRenderer } = load('src/components/DynamicRenderer');
  const props = { pageKey: 'offersHome', slot: 'beforeContent', actions: { 'offers.openAll': () => calls++ } };
  const rendered = DynamicRenderer(props).props.children.filter(Boolean);
  assert.deepEqual(rendered.map((element) => element.key), ['offersHome:beforeContent:heading', 'offersHome:beforeContent:hero', 'offersHome:beforeContent:space']);
  const textElement = rendered[0].props.children;
  assert.equal(textElement.type(textElement.props).props.children.props.children, 'Namaste');
  const heroElement = rendered[1].props.children;
  const hero = heroElement.type(heroElement.props);
  hero.props.children.find((child) => child?.props?.onPress).props.onPress();
  assert.equal(calls, 1);
  assert.equal(DynamicRenderer({ ...props, isVisible: () => false }).props.children.filter(Boolean).length, 0);
  assert.equal(DynamicRenderer({ ...props, isVisible: () => { throw new Error('Host visibility failed'); } }).props.children.filter(Boolean).length, 0);
  config.enabled = false; config.useNativeFallback = true;
  assert.equal(DynamicRenderer(props), null);
});

test('offer rails use existing cards and only the host-provided filtered data; missing handlers hide actions', () => {
  const { load } = loader({ mocks: { '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme }, './UIVisualAssets': { UINativeIcon: () => null, UIUploadedImage: () => null }, './OfferCard': { OfferCard: () => null }, './UILottie': { UILottie: () => null } } });
  const { ComponentRegistry } = load('src/components/ComponentRegistry');
  assert.deepEqual(Object.keys(ComponentRegistry), ['homeCard', 'text', 'heroBanner', 'offerRail', 'spacer', 'actionLink', 'lottie', 'illustration', 'image', 'icon']);
  const block = { id: 'rail', type: 'offerRail', props: { source: 'showcase', limit: 1, variant: 'compact' } };
  let chosen;
  const props = { block, locale: 'en', actions: {}, data: { offers: { showcase: [{ _id: 'approved' }, { _id: 'other' }] }, onOfferPress: (id) => { chosen = id; } } };
  const rail = ComponentRegistry.offerRail(props);
  assert.equal(rail.props.children.length, 1);
  assert.equal(rail.props.children[0].props.offer._id, 'approved');
  rail.props.children[0].props.onPress();
  assert.equal(chosen, 'approved');
  assert.equal(ComponentRegistry.offerRail({ ...props, data: {} }), null);
  assert.equal(ComponentRegistry.actionLink({ ...props, block: { id: 'link', type: 'actionLink', props: { label: { en: 'Settings' }, action: 'profile.openSettings' } } }), null);
});

test('renderer 2 validates published animation metadata and still accepts renderer 1 snapshots', () => {
  const { load } = loader();
  const { parseUIRuntime } = load('src/utils/dynamicUI');
  assert.equal(parseUIRuntime(fixture(load)).rendererVersion, 1);
  const runtime = fixture(load);
  const id = '507f1f77bcf86cd799439011';
  runtime.rendererVersion = 2; runtime.base.pages.offersHome.rendererVersion = 2;
  runtime.assets[id] = { id, sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 2, size: 100 };
  runtime.base.pages.offersHome.slots.beforeContent = [{ id: 'diya', type: 'lottie', props: { assetId: id, fallback: { en: 'Diwali offers' }, loop: true, loopCount: 3, speed: 1 } }];
  assert.equal(parseUIRuntime(runtime).assets[id].duration, 2);
  for (const change of [(r) => { r.rendererVersion = 1; }, (r) => { r.assets[id].sha256 = 'bad'; }, (r) => { r.base.pages.offersHome.slots.beforeContent[0].props.speed = 100; }, (r) => { r.assets = {}; }]) {
    const value = clone(runtime); change(value); assert.throws(() => parseUIRuntime(value));
  }
});

test('native and backend vector validation agree on expressions, media, cycles and valid self-contained JSON', () => {
  const { parseUIAnimation } = loader().load('src/utils/uiAnimation');
  const { validateAnimation } = require('../../backend/src/validators/uiAnimation');
  const valid = { v: '5.7.4', fr: 30, ip: 0, op: 60, w: 100, h: 100, assets: [], layers: [{ ty: 4, shapes: [] }] };
  assert.deepEqual(parseUIAnimation(valid), validateAnimation(valid).animation);
  for (const mutate of [(a) => { a.layers[0].x = 'execute()'; }, (a) => { a.assets = [{ id: 'image', p: 'https://bad.test' }]; }, (a) => { a.fr = 120; }, (a) => { a.layers[0].ty = 5; }, (a) => { a.assets = [{ id: 'cycle', layers: [{ ty: 0, refId: 'cycle' }] }]; }]) {
    const value = clone(valid); mutate(value);
    assert.throws(() => parseUIAnimation(value)); assert.throws(() => validateAnimation(value));
  }
});

test('renderer 4 shares visual styles, managed image identity and icon validation with the API', () => {
  const { load } = loader();
  const { parseUIRuntime, parseUIBlock } = load('src/utils/dynamicUI');
  const backend = require('../../backend/src/validators/ui.validator');
  const id = '507f1f77bcf86cd799439044';
  const runtime = fixture(load); runtime.rendererVersion = 4;
  runtime.assets[id] = { id, kind: 'image', mimeType: 'image/jpeg', sha256: 'a'.repeat(64), width: 800, height: 400, size: 1000, fps: 0, duration: 0 };
  const page = runtime.base.pages.offersHome; page.rendererVersion = 4;
  page.slots.beforeContent = [
    { id: 'photo', type: 'image', props: { assetId: id, alt: { en: 'Festival photo' }, height: 180, fit: 'cover' }, style: { widthPercent: 80, alignment: 'center', borderRadius: 16 } },
    { id: 'icon', type: 'icon', props: { name: 'Gift', size: 48, label: { en: 'Celebrate' } }, style: { fontSize: 24, color: '#172033', backgroundColor: '#FFFFFF', padding: 16 } },
  ];
  assert.doesNotThrow(() => backend.validateConfig(page));
  assert.equal(parseUIRuntime(runtime).assets[id].kind, 'image');
  for (const change of [
    (r) => { r.rendererVersion = 3; r.base.pages.offersHome.rendererVersion = 3; },
    (r) => { r.assets[id].kind = 'lottie'; }, (r) => { r.assets[id].mimeType = 'image/svg+xml'; },
    (r) => { r.base.pages.offersHome.slots.beforeContent[0].props.assetId = 'https://bad.test'; },
    (r) => { r.base.pages.offersHome.slots.beforeContent[1].props.name = 'ExecuteCode'; },
    (r) => { r.base.pages.offersHome.slots.beforeContent[1].style.fontSize = 100; },
    (r) => { r.base.pages.offersHome.slots.beforeContent[1].style.color = '#FFFFFF'; },
  ]) { const candidate = clone(runtime); change(candidate); assert.throws(() => parseUIRuntime(candidate)); }
  assert.equal(parseUIBlock({ id: 'bad', type: 'icon', props: { name: 'Gift' }, style: { transform: 'rotate(90deg)' } }, 'offersHome'), null);
});

test('native image and icon components use only published media and render edited typography', () => {
  const id = '507f1f77bcf86cd799439044';
  const config = { assets: { [id]: { id, kind: 'image' } } };
  const { load } = loader({ react: { ...React, useState: (value) => [value, () => {}] }, mocks: {
    '../hooks/useUIConfig': { useUIConfig: () => ({ state: { config } }) },
    '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme },
    '../services/api': { apiUrl: (path) => 'https://ui.test' + path },
    './OfferCard': { OfferCard: () => null }, './UILottie': { UILottie: () => null },
  } });
  const { UIUploadedImage, UINativeIcon } = load('src/components/UIVisualAssets');
  const image = UIUploadedImage({ assetId: id, alt: 'Festival image', height: 200, fit: 'contain' });
  assert.equal(image.props.resizeMode, 'contain'); assert.match(image.props.source.uri, /\/ui\/assets\/507f1f77bcf86cd799439044\?rendererVersion=6&campaignVersion=1/);
  assert.equal(image.props.accessibilityLabel, 'Festival image');
  const missing = UIUploadedImage({ assetId: 'not-published', alt: 'Static fallback' });
  assert.equal(missing.props.children.props.children, 'Static fallback');
  assert.equal(UINativeIcon({ name: 'ExecuteCode', color: '#000000' }), null);
  const { ComponentRegistry } = load('src/components/ComponentRegistry');
  const text = ComponentRegistry.text({ block: { id: 'text', type: 'text', props: { text: { en: 'Edited title' } }, style: { fontSize: 32, textAlign: 'center', fontWeight: '700', color: '#172033' } }, locale: 'en', actions: {}, data: {} });
  assert.equal(text.props.children.props.style.at(-1).fontSize, 32);
  assert.equal(text.props.children.props.style.at(-1).textAlign, 'center');
});

test('mobile preview and runtime metadata accept the 10 MB budget and reject the next byte', () => {
  const { load } = loader();
  const { UI_ANIMATION_MAX_BYTES } = load('src/utils/uiAnimationLimits');
  const { parseUIAnimation } = load('src/utils/uiAnimation');
  const { parseUIRuntime } = load('src/utils/dynamicUI');
  const { MAX_ANIMATION_BYTES } = require('../../backend/src/validators/uiAnimation');
  const { sizedAnimation } = require('../../../website/backend/tests/ui-animation.fixture');
  assert.equal(UI_ANIMATION_MAX_BYTES, MAX_ANIMATION_BYTES);
  assert.doesNotThrow(() => parseUIAnimation(sizedAnimation(MAX_ANIMATION_BYTES)));
  assert.throws(() => parseUIAnimation(sizedAnimation(MAX_ANIMATION_BYTES + 1)));
  const runtime = fixture(load);
  const id = '507f1f77bcf86cd799439011';
  runtime.rendererVersion = 2; runtime.base.pages.offersHome.rendererVersion = 2;
  runtime.assets[id] = { id, sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 1, size: MAX_ANIMATION_BYTES };
  runtime.base.pages.offersHome.slots.beforeContent = [{ id: 'large', type: 'lottie', props: { assetId: id, fallback: { en: 'Local offers' } } }];
  assert.equal(parseUIRuntime(runtime).assets[id].size, MAX_ANIMATION_BYTES);
  runtime.assets[id].size++;
  assert.throws(() => parseUIRuntime(runtime));
});

test('lazy animation transport deduplicates requests, validates identity and recovers from a bounded offline cache', async () => {
  const saved = storage(); let calls = 0;
  const asset = { id: '507f1f77bcf86cd799439011', sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 2, size: 100 };
  const animation = { v: '5.7.4', fr: 30, ip: 0, op: 60, w: 100, h: 100, assets: [], layers: [{ ty: 4, shapes: [] }] };
  const { load } = loader({ mocks: { '@react-native-async-storage/async-storage': saved }, fetch: async () => { calls++; return { status: 200, headers: new Headers(), text: async () => JSON.stringify({ success: true, asset: { ...asset, animation } }) }; } });
  const transport = load('src/services/uiAnimations');
  const one = transport.loadUIAnimation(asset); const two = transport.loadUIAnimation(asset);
  assert.equal(one, two); assert.deepEqual(await one, animation); await tick();
  assert.equal(calls, 1); assert.equal(saved.rows.size, 1);
  const offline = loader({ mocks: { '@react-native-async-storage/async-storage': saved }, fetch: async () => { throw new Error('Offline'); } }).load('src/services/uiAnimations');
  assert.deepEqual(await offline.loadUIAnimation(asset), animation);
  saved.rows.set([...saved.rows.keys()][0], '{bad');
  await assert.rejects(offline.loadUIAnimation(asset));
});

test('large animations download without overflowing Android storage; response limits still apply', async () => {
  const { sizedAnimation } = require('../../../website/backend/tests/ui-animation.fixture');
  const saved = storage();
  saved.rows.set('existing-small-cache', 'keep');
  const animation = sizedAnimation(10 * 1024 * 1024);
  const asset = { id: '507f1f77bcf86cd799439011', sha256: 'a'.repeat(64), width: 100, height: 100, fps: 30, duration: 1, size: 10 * 1024 * 1024 };
  const raw = JSON.stringify({ success: true, asset: { ...asset, animation } });
  const transport = loader({ mocks: { '@react-native-async-storage/async-storage': saved }, fetch: async () => ({ status: 200, headers: new Headers({ 'Content-Length': String(Buffer.byteLength(raw)) }), text: async () => raw }) }).load('src/services/uiAnimations');
  assert.equal((await transport.loadUIAnimation(asset)).layers[0].shapes.length, animation.layers[0].shapes.length);
  await tick();
  assert.deepEqual([...saved.rows.entries()], [['existing-small-cache', 'keep']]);
  const offline = loader({ mocks: { '@react-native-async-storage/async-storage': saved }, fetch: async () => { throw new Error('Offline'); } }).load('src/services/uiAnimations');
  await assert.rejects(offline.loadUIAnimation(asset), /Offline/);
  const { UI_ANIMATION_RESPONSE_MAX_BYTES } = loader().load('src/utils/uiAnimationLimits');
  for (const withLength of [true, false]) {
    const oversized = loader({ fetch: async () => ({ status: 200, headers: new Headers(withLength ? { 'Content-Length': String(UI_ANIMATION_RESPONSE_MAX_BYTES + 1) } : {}), text: async () => { assert.equal(withLength, false, 'oversized Content-Length is rejected before reading the body'); return ' '.repeat(UI_ANIMATION_RESPONSE_MAX_BYTES + 1); } }) }).load('src/services/uiAnimations');
    await assert.rejects(oversized.loadUIAnimation(asset), /Animation (unavailable|too large)/);
  }
});

function hookRenderer() {
  const slots = []; let cursor = 0, dirty = true; const pending = [];
  const equal = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], next => { const value = typeof next === 'function' ? next(slots[index]) : next; if (!Object.is(value, slots[index])) { slots[index] = value; dirty = true; } }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useMemo(work, deps) { const index = cursor++; if (!slots[index] || !equal(slots[index].deps, deps)) slots[index] = { deps, value: work() }; return slots[index].value; },
    useCallback(work, deps) { return react.useMemo(() => work, deps); },
    useEffect(work, deps) {
      const index = cursor++; const previous = slots[index];
      if (!previous || !equal(previous.deps, deps)) { slots[index] = { deps }; pending.push(() => { previous?.cleanup?.(); slots[index].cleanup = work(); }); }
    },
  };
  return { react, render(Component, props) {
    let tree; let attempts = 0; dirty = true;
    while (dirty) { assert.ok(++attempts < 30, 'component settles without a render loop'); dirty = false; cursor = 0; tree = Component(props); pending.splice(0).forEach(work => work()); }
    return tree;
  }, dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('renderer 6 accepts all header presets and only valid web destinations, matching both APIs', async () => {
  const { load, native } = loader();
  const { headerPreset, HOME_HEADER_PRESETS, validHomeLink } = load('src/utils/uiHomeHeader');
  const { parseUIRuntime } = load('src/utils/dynamicUI');
  const api = require('../../../website/backend/src/validators/ui.validator');
  for (const preset of HOME_HEADER_PRESETS) {
    const runtime = fixture(load); runtime.rendererVersion = 6;
    const page = runtime.base.pages.offersHome; page.rendererVersion = 6; page.homeHeader = headerPreset(preset.id);
    page.slots.beforeContent = [load('src/utils/uiHome').defaultHomeCards()[0]];
    Object.assign(page.slots.beforeContent[0].props, { homeAction: 'link', linkUrl: 'https://youtu.be/example?t=12' });
    assert.deepEqual(parseUIRuntime(runtime).base.pages.offersHome, api.validateConfig(page));
    for (const width of [224, 320, 390, 768]) {
      const geometry = load('src/utils/homeHeaderGeometry').homeHeaderGeometry(width, page.homeHeader, 4);
      assert.ok(geometry.viewport <= width); assert.ok(geometry.cardWidth <= geometry.viewport);
    }
    for (const change of [p => { p.rendererVersion = 5; }, p => { p.homeHeader.intervalSeconds = 11; }, p => { p.homeHeader.transition = 'invalid'; }, p => { p.slots.beforeContent[0].props.linkUrl = 'javascript:alert(1)'; }]) {
      const invalid = clone(runtime); change(invalid.base.pages.offersHome); assert.throws(() => parseUIRuntime(invalid));
    }
  }
  const opened = [], alerts = [];
  native.Linking = { openURL: async url => opened.push(url) }; native.Alert = { alert: (...args) => alerts.push(args) };
  const { openHomeLink } = load('src/services/homeLinks');
  for (const url of ['https://youtube.com/watch?v=example', 'https://example.com/a?x=1#details', 'http://example.com']) {
    assert.equal(await openHomeLink(url), true); assert.equal(opened.at(-1), url);
  }
  for (const url of ['javascript:alert(1)', 'file:///tmp/a', 'https://a.test/\n', 'https://user:secret@a.test', 'https://a.test\\@b.test', 'not-a-url']) {
    assert.equal(validHomeLink(url), false); assert.equal(await openHomeLink(url), false);
  }
  assert.equal(opened.length, 3);
  native.Linking.openURL = async () => { throw new Error('No handler'); };
  assert.equal(await openHomeLink('https://example.com'), false); assert.equal(alerts[0][0], 'Could not open link');
});

for (const style of ['photoCarousel', 'heroShortcuts', 'splitCarousel']) test(`${style} preserves card destinations, waits for media, and cancels motion in background`, async t => {
  const hooks = hookRenderer(), timers = new Map(), animations = [], tapped = [];
  let clock = 0, timerId = 0, appChanged, motionChanged;
  t.mock.method(global, 'setTimeout', (work, delay) => { const id = ++timerId; timers.set(id, { work, at: clock + delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  const { load, native } = loader({ react: hooks.react, mocks: {
    '../../context/AppContext': { useApp: () => ({ t: key => key, language: 'en' }) },
    '../../components/UIHomeMedia': { UIHomeMedia: 'HomeMedia' }, '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
  } });
  Object.assign(native, {
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: (_name, work) => { motionChanged = work; return { remove() {} }; } },
    AppState: { currentState: 'active', addEventListener: (_name, work) => { appChanged = work; return { remove() {} }; } },
    Animated: { View: 'AnimatedView', Value: class { setValue() {} }, add: () => 0, timing: (_value, options) => ({ start(work) { this.work = work; animations.push({ options, finish: () => work({ finished: true }) }); }, stop() { this.work?.({ finished: false }); } }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
  });
  const cards = load('src/utils/uiHome').defaultHomeCards().filter(card => card.props.placement === 'promo');
  cards.forEach((card, i) => Object.assign(card.props, { media: 'lottie', assetId: `animation-${i}`, homeAction: 'link', linkUrl: `https://example.com/${i}` }));
  const props = { cards, settings: load('src/utils/uiHomeHeader').headerPreset(style), onCardPress: card => tapped.push(card), onOffers() {}, onServices() {}, onPost() {}, onEvents() {} };
  const Component = load('src/screens/offers/HomeSlideCarousel').HomeSlideCarousel;
  const render = () => elements(hooks.render(Component, props));
  const active = () => render().find(node => node.type === 'HomeMedia' && node.props.active);
  const elapse = ms => { clock += ms; [...timers].forEach(([id, timer]) => { if (timer.at <= clock && timers.delete(id)) timer.work(); }); render(); };
  render(); await tick();
  const button = render().find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'link');
  button.props.onPress(); assert.equal(tapped.length, 1); assert.ok(cards.includes(tapped[0]));
  elapse(30_000); assert.equal(animations.length, 0);
  const first = active().props.onPlaybackEnd; first('finished'); render(); elapse(350);
  assert.equal(animations.length, 1); assert.equal(active(), undefined);
  animations.shift().finish(); render(); assert.equal(active().props.card.id, cards[1].id);
  first('finished'); render(); elapse(30_000); assert.equal(animations.length, 0, 'stale completion does not advance');
  active().props.onPlaybackEnd('unavailable'); render(); elapse(7000); assert.equal(animations.length, 1);
  const cancelled = animations.shift(); appChanged('background'); render(); cancelled.finish(); render(); assert.equal(timers.size, 0);
  appChanged('active'); motionChanged(true); render(); elapse(30_000); assert.equal(animations.length, 0);
  props.settings = { ...props.settings, autoPlay: false, transition: 'fade' }; motionChanged(false); render(); elapse(30_000); assert.equal(animations.length, 0);
  render().find(node => node.props?.accessibilityLabel === 'homeNextCard').props.onPress(); render();
  assert.equal(animations[0].options.duration, 160); animations.shift().finish(); render();
  assert.equal(animations[0].options.toValue, 1); animations.shift().finish(); render(); assert.ok(active());
  props.cards = cards.map(card => ({ ...card, props: { ...card.props, media: 'image', showCopy: true, fit: 'cover' } }));
  const imageOnly = render();
  assert.equal(imageOnly.filter(node => node.type === 'Text').length, 0, 'uploaded promotions never receive native copy');
  assert.ok(imageOnly.filter(node => node.type === 'HomeMedia').every(node => !node.props.style.some(style => style?.right)), 'uploaded art uses the full card even in split mode');
  hooks.dispose(); assert.equal(timers.size, 0);
});

test('header waits for full media playback, then settles the next card before starting its animation', async (t) => {
  const hooks = hookRenderer(), timers = new Map(), transitions = [];
  let clock = 0, timerId = 0, focused = true, appChanged, motionChanged;
  t.mock.method(global, 'setTimeout', (work, delay) => { const id = ++timerId; timers.set(id, { work, at: clock + delay }); return id; });
  t.mock.method(global, 'clearTimeout', id => timers.delete(id));
  const { load, native } = loader({ react: hooks.react, mocks: {
    '../../context/AppContext': { useApp: () => ({ t: key => key, language: 'en' }) },
    '../../components/UIHomeMedia': { UIHomeMedia: 'HomeMedia' },
    '@react-navigation/native': { useIsFocused: () => focused },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
  } });
  const animation = durations => ({ start(work) { this.work = work; transitions.push({ durations, finish: () => work({ finished: true }) }); }, stop() { this.work?.({ finished: false }); } });
  Object.assign(native, {
    useWindowDimensions: () => ({ width: 390, height: 844 }),
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: (_name, work) => { motionChanged = work; return { remove() {} }; } },
    AppState: { currentState: 'active', addEventListener: (_name, work) => { appChanged = work; return { remove() {} }; } },
    Animated: { View: 'AnimatedView', Text: 'AnimatedText', Value: class { setValue() {} interpolate() { return 1; } },
      timing: (_value, options) => animation([options.duration]), sequence: parts => animation(parts.flatMap(part => part.durations || [])), },
    Easing: { cubic: x => x, out: fn => fn, inOut: fn => fn }, PanResponder: { create: () => ({ panHandlers: {} }) },
  });
  const cards = load('src/utils/uiHome').defaultHomeCards().slice(0, 2);
  cards.forEach((card, index) => Object.assign(card.props, { media: 'lottie', assetId: `animation-${index}` }));
  const Component = load('src/screens/offers/HomePromoCarousel').AccordionCarousel;
  const props = { cards, onOffers() {}, onServices() {}, onPost() {}, onEvents() {} };
  const render = () => elements(hooks.render(Component, props));
  const media = () => render().filter(node => node.type === 'HomeMedia');
  const elapse = ms => { clock += ms; [...timers].forEach(([id, timer]) => { if (timer.at <= clock && timers.delete(id)) timer.work(); }); render(); };
  render(); await tick();
  assert.equal(media().filter(node => node.props.active).length, 1);
  elapse(30_000);
  assert.equal(transitions.length, 0, 'long animations are never cut by the former seven-second interval');
  const firstCompletion = media()[0].props.onPlaybackEnd;
  firstCompletion('finished'); render(); elapse(350);
  assert.equal(transitions.length, 1);
  assert.equal(media().some(node => node.props.active), false);
  elapse(30_000); assert.equal(transitions.length, 1, 'no second transition while the rail is moving');
  transitions.shift().finish(); render();
  assert.equal(media()[0].props.card.id, cards[1].id);
  assert.equal(media()[0].props.active, false, 'incoming animation waits for expansion');
  transitions.shift().finish(); render();
  assert.equal(media()[0].props.active, true);
  firstCompletion('finished'); render(); elapse(10_000);
  assert.equal(transitions.length, 0, 'late completion from the previous card cannot advance the current card');
  media()[0].props.onPlaybackEnd('unavailable'); render(); elapse(6_999);
  assert.equal(transitions.length, 0);
  elapse(1); assert.equal(transitions.length, 1, 'unavailable artwork falls back to the normal static-card hold');
  const cancelledTransition = transitions.shift();
  appChanged('background'); render(); assert.equal(timers.size, 0);
  cancelledTransition.finish(); render();
  assert.equal(transitions.length, 0, 'a cancelled transition cannot restart animation after backgrounding');
  appChanged('active'); render();
  focused = false; render(); assert.equal(timers.size, 0);
  focused = true; motionChanged(true); render(); assert.equal(timers.size, 0);
  transitions.length = 0;
  cards.forEach(card => { card.props.media = 'bundled'; });
  motionChanged(false); render(); elapse(6_999);
  assert.equal(transitions.length, 0);
  elapse(1); assert.equal(transitions.length, 1);
  transitions.shift().finish(); render();
  elapse(30_000); assert.equal(transitions.length, 1, 'static-card hold does not run during expansion');
  transitions.shift().finish(); render(); elapse(6_999);
  assert.equal(transitions.length, 0);
  elapse(1); assert.equal(transitions.length, 1, 'static cards receive the full hold after expansion finishes');
  hooks.dispose();
});

test('Lottie reports completion only after all configured plays and ignores cancelled playback', () => {
  const h = nativeScreen({ mocks: {
    '../hooks/useUIConfig': { useUIConfig: () => ({ state: { config: { assets: { animation: { id: 'animation' } } } } }) },
    '../context/DynamicThemeProvider': { useDynamicTheme: () => h.load('src/theme/index').theme },
  } });
  const Component = h.load('src/components/UILottie').UILottie;
  const results = [];
  const props = { block: { id: 'card', type: 'lottie', props: { assetId: 'animation', fallback: { en: 'Static' }, loop: true, loopCount: 3 } }, locale: 'en', onPlaybackEnd: value => results.push(value) };
  h.render(Component, props);
  Object.assign(h.slots, [false, true, true, { layers: [] }, false]);
  let plays = 0; h.refs[1].current = { play: () => plays++ };
  const player = elements(h.render(Component, props)).find(node => node.props?.onAnimationFinish);
  player.props.onAnimationFinish(true); assert.deepEqual(results, []);
  player.props.onAnimationFinish(false); player.props.onAnimationFinish(false);
  assert.equal(plays, 2); assert.deepEqual(results, []);
  player.props.onAnimationFinish(false); assert.deepEqual(results, ['finished']);
  assert.equal(elements(h.render(Component, props)).some(node => node.props?.onAnimationFinish), false);
});

test('actual Lottie component uses static fallback offscreen, in background and with reduced motion', () => {
  const id = '507f1f77bcf86cd799439011'; let focused = true, values, cursor;
  const react = { ...React, useEffect() {}, useRef: () => ({ current: null }), useState: () => [values[cursor++], () => {}] };
  const { load, native } = loader({ react, mocks: {
    '../hooks/useUIConfig': { useUIConfig: () => ({ state: { config: { assets: { [id]: { id } } } } }) },
    '../context/DynamicThemeProvider': { useDynamicTheme: () => load('src/theme/index').theme },
    '../services/uiAnimations': { loadUIAnimation: () => assert.fail('Inactive media cannot load') },
    '@react-navigation/native': { useIsFocused: () => focused },
  } });
  native.useWindowDimensions = () => ({ width: 320, height: 568 });
  const Component = load('src/components/UILottie').UILottie;
  const render = (next) => { values = next; cursor = 0; return Component({ block: { id: 'animation', type: 'lottie', props: { assetId: id, fallback: { en: 'Static content' } } }, locale: 'en' }); };
  const active = [false, true, true, { layers: [] }, false];
  assert.ok(elements(render(active)).some((node) => node.type === React.Suspense));
  for (const [index, value] of [[0, true], [1, false], [2, false], [4, true]]) {
    const state = [...active]; state[index] = value; const tree = render(state);
    assert.equal(tree.props.pointerEvents, 'none');
    assert.equal(elements(tree).some((node) => node.type === React.Suspense), false);
    assert.ok(elements(tree).some((node) => node.props?.children === 'Static content'));
  }
  focused = false; assert.equal(elements(render(active)).some((node) => node.type === React.Suspense), false);
});

test('actual provider expires before foreground refresh and keeps its children mounted', (t) => {
  const calls = [], effects = []; let onAppState;
  const store = { subscribe: () => () => {}, getSnapshot: () => ({}), start: () => { calls.push('start'); }, expire: () => calls.push('expire'), refresh: () => { calls.push('refresh'); }, stop: () => calls.push('stop'), setLocale: () => {}, nextRefreshDelay: () => 1000 };
  const react = { ...React, useMemo: (work) => work(), useSyncExternalStore: (_subscribe, read) => read(), useEffect: (work) => effects.push(work) };
  t.mock.method(global, 'setInterval', () => 1); t.mock.method(global, 'clearInterval', () => {});
  t.mock.method(global, 'setTimeout', () => 1); t.mock.method(global, 'clearTimeout', () => {});
  const { load, native } = loader({ react, mocks: { './AppContext': { useApp: () => ({ language: 'en' }) }, '../services/api': { API_BASE_URL: 'https://ui.test' }, '../services/uiRuntime': { createUIRuntimeStore: () => store } } });
  native.AppState.addEventListener = (_name, work) => { onAppState = work; return { remove() {} }; };
  const child = React.createElement('NativeNavigation');
  const tree = load('src/context/UIConfigProvider').UIConfigProvider({ children: child });
  const cleanups = effects.map((work) => work());
  calls.length = 0; onAppState('background'); onAppState('active');
  assert.deepEqual(calls, ['expire', 'expire', 'refresh']); assert.equal(tree.props.children, child);
  cleanups.forEach((cleanup) => cleanup?.()); assert.equal(calls.at(-1), 'stop');
});

test('existing auth/boot branches and conditional Post tab remain unchanged', () => {
  const appState = { hasApprovedBusiness: false, t: (key) => key, isBootstrapping: true, isAuthenticated: false, themeMode: 'dark', remoteSettings: {} };
  const hooks = { ...React, useEffect: () => {}, useCallback: (callback) => callback, useRef: (value) => ({ current: value }), useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}] };
  const mocks = {
    '../context/AppContext': { useApp: () => appState },
    '@react-navigation/bottom-tabs': { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }) },
    '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Stack', Screen: 'StackScreen' }) },
    '@react-navigation/native': { NavigationContainer: 'NavigationContainer', DefaultTheme: { colors: {} }, DarkTheme: { colors: {} } },
    '@react-navigation/elements': { PlatformPressable: 'PlatformPressable' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    './hideTabBarOnScroll': { setTabBarHeight() {}, tabBarTranslateY: {} },
  };
  for (const name of ['Offers', 'Services', 'Post', 'More', 'Profile', 'Auth', 'MainTab']) mocks[`./${name}Navigator`] = { [`${name}Navigator`]: `${name}Navigator` };
  for (const name of ['GlobalLoadingHost', 'LogoLoader', 'WelcomeModal', 'AnnouncementModal']) mocks[`../components/${name}`] = { [name]: name };
  const { load } = loader({ mocks, react: hooks });
  const tabs = load('src/navigation/MainTabNavigator').MainTabNavigator;
  const names = () => tabs().props.children.filter(Boolean).map((element) => element.props.name);
  assert.deepEqual(names(), ['OffersTab', 'ServicesTab', 'MoreTab', 'ProfileTab']);
  appState.hasApprovedBusiness = true;
  assert.deepEqual(names(), ['OffersTab', 'ServicesTab', 'PostTab', 'MoreTab', 'ProfileTab']);
  const rootNavigator = load('src/navigation/RootNavigator').RootNavigator;
  assert.equal(rootNavigator().props.children.type, 'LogoLoader');
  appState.isBootstrapping = false;
  const screen = () => rootNavigator().props.children[0].props.children.props.children.props.name;
  assert.equal(screen(), 'Auth');
  appState.isAuthenticated = true;
  assert.equal(screen(), 'Main');
  const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
  assert.ok(app.includes('<UIConfigProvider>') && app.includes('<DynamicThemeProvider>'));
  assert.ok(!app.includes('state.loading'));
  const home = fs.readFileSync(path.join(root, 'src/screens/offers/OffersHomeScreen.tsx'), 'utf8');
  assert.match(home, /slot="beforeContent"/);
  assert.match(home, /slot="afterContent"/);
  assert.match(home, /nearby: sortedOffers, showcase: homeShowcase\?\.trendingOffers/);
  assert.match(home, /<HyperlocalHeader/);
  assert.match(home, /<CityPickerModal/);
});
