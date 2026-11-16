// Contract v1 is mirrored in the app API; contract parity is checked by the UI tests.
const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const SCHEMA_VERSION = 1;
const RENDERER_VERSION = 6;
const { validHomeLink, homeHeader } = require('./uiHomeHeader');
const visual = require('./uiVisual.json');
const presentation = require('./uiPresentation.json');
const MAX_BYTES = 256 * 1024;
const HEAD_KEY = 'ui.activeRelease';
const PAGE_KEYS = Object.freeze(['onboarding', 'login', 'otp', 'profileSetup', 'offersHome', 'offerDetails',
  'servicesHome', 'serviceCategories', 'serviceProviders', 'businessCenter', 'plans', 'more', 'profile']);
const COLOR_KEYS = Object.freeze(['primary', 'primaryBright', 'primaryDark', 'accent', 'background', 'surface',
  'text', 'textSecondary', 'border', 'backdropStart', 'backdropEnd']);
const ACTIONS = Object.freeze(['offers.openAll', 'business.openCenter', 'profile.openSettings']);
const AUTH_PAGES = new Set(['onboarding', 'login', 'otp', 'profileSetup']);
// Only contrast-relevant tokens are needed here. Runtime defaults leave bundled palettes intact.
const DEFAULT_COLORS = {
  light: { primary: '#118F91', primaryDark: '#0A6F71', accent: '#F45B18', background: '#F8FAFB', surface: '#FFFFFF', text: '#171717', textSecondary: '#5C5C5C' },
  dark: { primary: '#00C2CC', primaryDark: '#0097A0', accent: '#FF7A3D', background: '#000000', surface: '#080E10', text: '#F7FCFD', textSecondary: '#B4C2C5' },
};
const plainText = Joi.string().max(500).pattern(/<\/?[a-z][^>]*>|javascript\s*:|data\s*:|\{\{|\}\}/i, { invert: true });
const localized = Joi.object({ en: plainText.required(), hi: plainText }).unknown(false);
const token = Joi.string().valid('text', 'textSecondary');
const background = Joi.string().valid('background', 'surface', 'primary', 'primaryDark', 'accent');
const action = Joi.string().valid(...ACTIONS);
const propsByType = {
  homeCard: Joi.object({
    placement: Joi.string().valid('promo', 'aboveTrending', 'belowTrending', 'trending', 'offer').required(),
    title: localized.required(), subtitle: localized, compactSubtitle: localized, badge: localized, buttonLabel: localized,
    homeAction: Joi.string().valid('offers', 'services', 'post', 'events', 'link'),
    linkUrl: Joi.when('homeAction', { is: 'link', then: Joi.string().max(2048).custom((value, helpers) => validHomeLink(value) ? value : helpers.error('string.uri')).required(), otherwise: Joi.forbidden() }),
    media: Joi.string().valid('bundled', 'image', 'lottie', 'none').required(),
    bundled: Joi.string().valid('offers', 'post', 'events', 'services', 'support', 'moreDeals').required(),
    assetId: Joi.when('media', { is: Joi.valid('image', 'lottie'), then: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(), otherwise: Joi.forbidden() }),
    offerId: Joi.when('placement', { is: 'offer', then: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(), otherwise: Joi.forbidden() }),
    limit: Joi.number().integer().min(1).max(40), height: Joi.number().integer().min(80).max(240),
    speed: Joi.number().min(0.25).max(2), loopCount: Joi.number().integer().min(1).max(3), fit: Joi.string().valid('contain', 'cover'), showCopy: Joi.boolean(),
  }).unknown(false),
  illustration: Joi.object({ image: Joi.string().valid('welcome', 'offers', 'services', 'business').required(), alt: localized.required(), height: Joi.number().integer().min(96).max(240), fit: Joi.string().valid('contain', 'cover') }).unknown(false),
  text: Joi.object({ text: localized.required(), variant: Joi.string().valid('heading', 'body', 'caption'), colorToken: token, backgroundToken: background }).unknown(false),
  heroBanner: Joi.object({ title: localized.required(), subtitle: localized, buttonLabel: localized, action, colorToken: token, backgroundToken: background,
    imageAssetId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/), imageHeight: Joi.number().integer().min(80).max(320) })
    .and('buttonLabel', 'action').unknown(false),
  offerRail: Joi.object({ source: Joi.string().valid('nearby', 'showcase').required(), variant: Joi.string().valid('standard', 'compact'), limit: Joi.number().integer().min(1).max(12) }).unknown(false),
  spacer: Joi.object({ height: Joi.number().integer().min(0).max(48).required() }).unknown(false),
  image: Joi.object({ assetId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(), alt: localized.required(), height: Joi.number().integer().min(64).max(480), fit: Joi.string().valid('contain', 'cover') }).unknown(false),
  icon: Joi.object({ name: Joi.string().valid(...visual.icons).required(), size: Joi.number().integer().min(16).max(96), label: localized, colorToken: token, backgroundToken: background }).unknown(false),
  actionLink: Joi.object({ label: localized.required(), action: action.required() }).unknown(false),
  lottie: Joi.object({ assetId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(), fallback: localized.required(),
    speed: Joi.number().min(0.25).max(2), loop: Joi.boolean(), loopCount: Joi.number().integer().min(1).max(3),
    width: Joi.number().integer().min(32).max(320), height: Joi.number().integer().min(32).max(320),
    alignment: Joi.string().valid('left', 'center', 'right') }).unknown(false),
};
const block = Joi.object({
  style: Joi.object({ padding: Joi.number().integer().min(0).max(32), marginBottom: Joi.number().integer().min(0).max(32), borderRadius: Joi.number().integer().min(0).max(32),
    widthPercent: Joi.number().integer().min(25).max(100), alignment: Joi.string().valid('left', 'center', 'right'), fontSize: Joi.number().integer().min(10).max(40),
    textAlign: Joi.string().valid('left', 'center', 'right'), fontWeight: Joi.string().valid('normal', '600', '700'), fontFamily: Joi.string().valid('default', 'serif', 'monospace'), letterSpacing: Joi.number().min(0).max(3),
    color: Joi.string().pattern(/^#[a-fA-F0-9]{6}$/), backgroundColor: Joi.string().pattern(/^#[a-fA-F0-9]{6}$/) }).unknown(false),
  hidden: Joi.boolean(),
  id: Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/).required(),
  type: Joi.string().valid(...Object.keys(propsByType)).required(),
  props: Joi.alternatives().conditional('type', {
    switch: Object.entries(propsByType).map(([is, then]) => ({ is, then: then.required() })),
  }),
}).unknown(false);
const presentationFor = (key) => Joi.object(Object.fromEntries(Object.entries(key === 'offersHome' ? {} : { ...presentation.common, ...presentation.pages[key] }).map(([field, choices]) => [field, choices ? Joi.string().valid(...choices) : localized]))).unknown(false);
const pageConfig = Joi.object({
  presentation: Joi.alternatives().conditional('key', { switch: PAGE_KEYS.map((is) => ({ is, then: presentationFor(is) })) }),
  schemaVersion: Joi.number().valid(SCHEMA_VERSION).required(), kind: Joi.string().valid('page').required(),
  key: Joi.string().valid(...PAGE_KEYS).required(), rendererVersion: Joi.number().valid(1, 2, 3, 4, 5, RENDERER_VERSION).required(),
  homeHeader: Joi.when('key', { is: 'offersHome', then: homeHeader, otherwise: Joi.forbidden() }),
  slots: Joi.object({ beforeContent: Joi.array().items(block).max(40).required(), afterContent: Joi.array().items(block).max(40).required() }).required().unknown(false),
}).unknown(false);
const colors = Joi.object(Object.fromEntries(COLOR_KEYS.map((key) => [key, Joi.string().pattern(/^#[a-fA-F0-9]{6}$/)]))).unknown(false);
const mode = Joi.object({ colors: colors.required() }).unknown(false);
const themeConfig = Joi.object({
  schemaVersion: Joi.number().valid(SCHEMA_VERSION).required(), kind: Joi.string().valid('theme').required(),
  key: Joi.string().valid('global').required(), modes: Joi.object({ light: mode.required(), dark: mode.required() }).unknown(false).required(),
}).unknown(false);
const configSchema = Joi.alternatives().try(pageConfig, themeConfig).required();
const strictOptions = { abortEarly: false, allowUnknown: false, stripUnknown: false, convert: false };

const fail = (message, details) => { throw new ApiError(422, message, 'UI_CONFIG_INVALID', details); };
const assertSafeJSON = (input) => {
  const walk = (value, depth) => {
    if (depth > 10) fail('UI configuration is too deeply nested');
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
    if (typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) fail('Only plain JSON data is supported');
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || key.startsWith('$') || key.includes('.')) fail('Unsafe UI configuration property');
      walk(child, depth + 1);
    }
  };
  walk(input, 0);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_BYTES) fail('UI configuration exceeds 256 KB');
};
const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
    .map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
const checkContrast = (theme, pages) => {
  for (const name of ['light', 'dark']) {
    const palette = { ...DEFAULT_COLORS[name], ...theme.modes[name].colors };
    for (const fg of ['text', 'textSecondary']) {
      for (const bg of ['background', 'surface']) {
        if (contrast(palette[fg], palette[bg]) < 4.5) fail(`Theme ${name}: ${fg}/${bg} contrast must be at least 4.5:1`);
      }
    }
    for (const page of Object.values(pages)) {
      for (const item of [...page.slots.beforeContent, ...page.slots.afterContent]) {
        if (!['text', 'heroBanner', 'icon', 'homeCard'].includes(item.type)) continue;
        if (contrast(item.style?.color || palette[item.props.colorToken || 'text'], item.style?.backgroundColor || palette[item.props.backgroundToken || 'surface']) < 4.5) {
          fail(`Page ${page.key}: block ${item.id} has insufficient ${name} contrast`);
        }
      }
    }
  }
};
const validateConfig = (input) => {
  assertSafeJSON(input);
  const { error, value } = configSchema.validate(input, strictOptions);
  if (error) fail('Invalid UI configuration', error.details.map((entry) => ({ path: entry.path.join('.'), message: entry.message })));
  if (value.kind === 'page') {
    const blocks = [...value.slots.beforeContent, ...value.slots.afterContent];
    const nativeHome = blocks.filter(item => item.type === 'homeCard');
    if (value.homeHeader && value.rendererVersion < 6) fail('Header styles require renderer 6');
    if (nativeHome.some(item => item.props.homeAction === 'link' && (value.rendererVersion < 6 || !['promo', 'aboveTrending', 'belowTrending'].includes(item.props.placement)))) fail('Card links require renderer 6 and a promotional card or banner');
    if (nativeHome.length && (value.key !== 'offersHome' || value.rendererVersion < 5)) fail('Home cards require offersHome renderer 5');
    if (nativeHome.filter(item => item.props.placement === 'promo').length > 8 || nativeHome.filter(item => item.props.placement === 'offer').length > 12) fail('Home allows up to 8 promotions and 12 offer artwork overrides');
    for (const placement of ['aboveTrending', 'belowTrending', 'trending']) {
      if (nativeHome.filter(item => item.props.placement === placement).length > 1) fail('Duplicate home placement');
    }
    const offerIds = nativeHome.filter(item => item.props.placement === 'offer').map(item => item.props.offerId);
    if (new Set(offerIds).size !== offerIds.length) fail('Duplicate offer artwork override');
    if (blocks.length > 40 || new Set(blocks.map((item) => item.id)).size !== blocks.length) fail('A page allows at most 40 blocks with unique IDs');
    if (value.rendererVersion < 2 && blocks.some((item) => Object.hasOwn(item, 'hidden'))) fail('Visibility requires renderer 2');
    if (AUTH_PAGES.has(value.key) && blocks.some((item) => item.props.action)) fail('Authentication pages cannot contain remote navigation actions');
    if (value.key !== 'offersHome' && blocks.some((item) => item.type === 'offerRail')) fail('Offer rails are supported only on offersHome');
    if (blocks.some((item) => item.type === 'lottie') && (value.rendererVersion < 2 || (value.key !== 'offersHome' && value.rendererVersion < 3))) fail('Screen animations require renderer 3');
    if ((value.presentation || blocks.some((item) => item.type === 'illustration')) && value.rendererVersion < 3) fail('Presentation and illustrations require renderer 3');
    if (blocks.filter((item) => item.type === 'lottie').length > 1) fail('Only one animation per page is supported');
    if (value.rendererVersion < 4 && blocks.some((item) => item.style || ['image', 'icon'].includes(item.type) || item.props.imageAssetId)) fail('Visual editor sections require renderer 4');
  } else checkContrast(value, {});
  return JSON.parse(JSON.stringify(value));
};
const defaultBase = () => ({
  pages: Object.fromEntries(PAGE_KEYS.map((key) => [key, { schemaVersion: SCHEMA_VERSION, kind: 'page', key, rendererVersion: 1, slots: { beforeContent: [], afterContent: [] } }])),
  theme: { schemaVersion: SCHEMA_VERSION, kind: 'theme', key: 'global', modes: { light: { colors: {} }, dark: { colors: {} } } },
});
const checkBase = (base) => {
  checkContrast(base.theme, base.pages);
  assertSafeJSON(base);
  const reserve = Object.values(base.pages).some((page) => page.rendererVersion >= 4) ? 40 * 1024 : Object.values(base.pages).some((page) => page.rendererVersion >= 3) ? 8192 : 2048;
  if (Buffer.byteLength(JSON.stringify(base), 'utf8') > MAX_BYTES - reserve) fail('Combined UI release exceeds the runtime size budget');
  return base;
};
const buildBase = (release, revisions) => {
  if (release.schemaVersion !== SCHEMA_VERSION || ![1, 2, 3, 4, 5, RENDERER_VERSION].includes(release.rendererVersion) || release.campaignRevisionIds?.length) fail('Unsupported UI release version');
  const base = defaultBase();
  const byId = new Map(revisions.map((revision) => [String(revision._id), revision]));
  const read = (id, kind, key) => {
    const revision = byId.get(String(id));
    if (!revision || revision.status !== 'published' || revision.kind !== kind || revision.key !== key) fail('Published UI revision is missing or mismatched');
    const config = validateConfig(revision.config);
    if (config.kind !== kind || config.key !== key) fail('Published UI revision identity mismatch');
    return config;
  };
  const refs = release.pageRevisionIds;
  if (!refs || Object.getPrototypeOf(refs) !== Object.prototype || Object.keys(refs).some((key) => !PAGE_KEYS.includes(key))) fail('Invalid page revision references');
  for (const [key, id] of Object.entries(refs)) base.pages[key] = read(id, 'page', key);
  if (release.themeRevisionId) base.theme = read(release.themeRevisionId, 'theme', 'global');
  return checkBase(base);
};

const id = Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required();
const integer = Joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER - 1);
const expectedDraftVersion = integer.min(1).required();
const reason = plainText.min(3).required();
const requestSchema = (body = Joi.object({}), query = Joi.object({}), params = Joi.object({})) => Joi.object({ body, query, params }).prefs(strictOptions);
const pagination = { page: integer.min(1).default(1), limit: integer.min(1).max(100).default(20) };
const listConfigs = requestSchema(undefined, Joi.object({ ...pagination, kind: Joi.string().valid('page', 'theme'), status: Joi.string().valid('draft', 'published') }).prefs({ convert: true }));
const getById = requestSchema(undefined, undefined, Joi.object({ id }));
const assetRead = requestSchema(undefined, Joi.object({ cityId: id.optional(), campaignVersion: integer.valid(1), rendererVersion: integer.valid(1, 2, 3, 4, 5, 6) }).prefs({ convert: true }), Joi.object({ id }));
const createDraft = requestSchema(Joi.object({ config: configSchema, sourceRevisionId: id.optional() }).required());
const updateDraft = requestSchema(Joi.object({ config: configSchema, expectedDraftVersion }).required(), undefined, Joi.object({ id }));
const validateInput = requestSchema(Joi.object({ config: configSchema }).required());
const validateDraft = requestSchema(Joi.object({ expectedDraftVersion }).required(), undefined, Joi.object({ id }));
const publish = requestSchema(Joi.object({ expectedDraftVersion, expectedGeneration: integer.required(), reason }).required(), undefined, Joi.object({ id }));
const listReleases = requestSchema(undefined, Joi.object(pagination).prefs({ convert: true }));
const rollback = requestSchema(Joi.object({ expectedGeneration: integer.required(), reason }).required(), undefined, Joi.object({ id }));
const runtime = requestSchema(undefined, Joi.object({ rendererVersion: integer.min(1).default(RENDERER_VERSION), campaignVersion: integer.valid(1), cityId: id.optional(), locale: Joi.string().valid('en', 'hi').default('en') }).prefs({ convert: true }));
const assetCreate = requestSchema(Joi.object({ name: plainText.max(120).required(), mimeType: Joi.string().valid('application/json').required(), animation: Joi.object().required() }).required());
const imageCreate = requestSchema(Joi.object({ name: plainText.max(120).required(), mimeType: Joi.string().valid('image/png', 'image/jpeg').required(), dataBase64: Joi.string().max(Math.ceil(visual.imageMaxBytes / 3) * 4).required() }).required());
const assetUpdate = requestSchema(Joi.object({ name: plainText.max(120).required(), enabled: Joi.boolean().required(), expectedVersion: integer.min(1).required() }).required(), undefined, Joi.object({ id }));
const assetArchive = requestSchema(Joi.object({ expectedVersion: integer.min(1).required() }).required(), undefined, Joi.object({ id }));
const listAssets = requestSchema(undefined, Joi.object(pagination).prefs({ convert: true }));
const validate = (schema) => (req, _res, next) => {
  try {
    const { error, value } = schema.validate({ body: req.body || {}, query: req.query || {}, params: req.params || {} });
    if (error) throw new ApiError(422, 'Invalid UI request', 'VALIDATION_ERROR', error.details.map((entry) => ({ path: entry.path.join('.'), message: entry.message })));
    if (value.body.config) value.body.config = validateConfig(value.body.config);
    Object.assign(req, value);
    next();
  } catch (error) { next(error); }
};

module.exports = { SCHEMA_VERSION, RENDERER_VERSION, HEAD_KEY, PAGE_KEYS, MAX_BYTES, validateConfig, buildBase, checkBase, defaultBase,
  validate, listConfigs, getById, createDraft, updateDraft, validateInput, validateDraft, publish, listReleases, rollback, runtime,
  assetCreate, imageCreate, assetUpdate, assetArchive, listAssets, assetRead };
