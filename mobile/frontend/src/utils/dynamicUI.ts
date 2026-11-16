import { palettes } from '../theme/palettes';
import presentation from './uiPresentation.json';
import { UI_ANIMATION_MAX_BYTES } from './uiAnimationLimits';
import { blockAssetId, needsVisualRenderer, uiVisual } from './uiVisual';
import { isHomeHeader, validHomeLink } from './uiHomeHeader';
import { UI_ACTIONS, UI_COLOR_KEYS, UI_MAX_BYTES, UI_PAGE_KEYS, type UIBlock, type UIPageKey, type UIRuntime, type UITheme } from '../types/dynamicUI';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keys = (value: RecordValue, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
const has = (value: RecordValue, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const optional = (value: RecordValue, key: string, check: (value: unknown) => boolean) => !has(value, key) || check(value[key]);
const member = (value: unknown, list: readonly unknown[]) => list.includes(value);
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const localized = (value: unknown) => object(value) && keys(value, ['en', 'hi']) && text(value.en) && optional(value, 'hi', text);
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 500
  && !/<\/?[a-z][^>]*>|javascript\s*:|data\s*:|\{\{|\}\}/i.test(value);
const foreground = ['text', 'textSecondary'];
const background = ['background', 'surface', 'primary', 'primaryDark', 'accent'];
const section = (props: RecordValue) => optional(props, 'colorToken', (v) => member(v, foreground)) && optional(props, 'backgroundToken', (v) => member(v, background));
const id = (value: unknown) => typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));

export const jsonBytes = (value: string) => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const point = value.codePointAt(index)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (point > 0xffff) index += 1;
  }
  return bytes;
};
const safeJSON = (value: unknown, depth = 0): boolean => {
  if (depth > 10) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!Array.isArray(value) && !object(value)) return false;
  return Object.entries(value).every(([key, child]) => !['__proto__', 'constructor', 'prototype'].includes(key)
    && !key.startsWith('$') && !key.includes('.') && safeJSON(child, depth + 1));
};

export const presentationFields = (pageKey: UIPageKey): Record<string, string[] | null> => pageKey === 'offersHome' ? {} : ({ ...presentation.common, ...presentation.pages[pageKey] });
export const isUIPresentation = (value: unknown, pageKey: UIPageKey) => object(value) && Object.entries(value).every(([field, v]) => {
  const fields = presentationFields(pageKey);
  return has(fields, field) && (fields[field] ? member(v, fields[field]!) : localized(v));
});
export function parseUIBlock(value: unknown, pageKey: UIPageKey): UIBlock | null {
  if (!object(value) || !keys(value, ['id', 'type', 'props', 'hidden', 'style']) || !optional(value, 'hidden', (v) => typeof v === 'boolean') || typeof value.id !== 'string'
    || !/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(value.id) || !object(value.props) || !safeJSON(value)) return null;
  const props = value.props;
  if (has(value, 'style')) {
    const s = value.style;
    if (!object(s) || !keys(s, ['padding', 'marginBottom', 'borderRadius', 'widthPercent', 'alignment', 'fontSize', 'textAlign', 'fontWeight', 'fontFamily', 'letterSpacing', 'color', 'backgroundColor'])
      || !['color', 'backgroundColor'].every((key) => optional(s, key, (v) => typeof v === 'string' && /^#[a-fA-F0-9]{6}$/.test(v)))
      || !['padding', 'marginBottom', 'borderRadius'].every((key) => optional(s, key, (v) => integer(v, 0, 32)))
      || !optional(s, 'widthPercent', (v) => integer(v, 25, 100)) || !optional(s, 'fontSize', (v) => integer(v, 10, 40))
      || !optional(s, 'letterSpacing', (v) => typeof v === 'number' && v >= 0 && v <= 3)
      || !['alignment', 'textAlign'].every((key) => optional(s, key, (v) => member(v, ['left', 'center', 'right'])))
      || !optional(s, 'fontWeight', (v) => member(v, ['normal', '600', '700'])) || !optional(s, 'fontFamily', (v) => member(v, ['default', 'serif', 'monospace']))) return null;
  }
  if (['onboarding', 'login', 'otp', 'profileSetup'].includes(pageKey) && has(props, 'action')) return null;
  let valid = false;
  switch (value.type) {
    case 'homeCard': valid = pageKey === 'offersHome'
      && keys(props, ['placement', 'title', 'subtitle', 'compactSubtitle', 'badge', 'buttonLabel', 'homeAction', 'linkUrl', 'media', 'bundled', 'assetId', 'offerId', 'limit', 'height', 'speed', 'loopCount', 'fit', 'showCopy'])
      && member(props.placement, ['promo', 'aboveTrending', 'belowTrending', 'trending', 'offer']) && localized(props.title)
      && optional(props, 'compactSubtitle', localized) && optional(props, 'badge', localized)
      && optional(props, 'subtitle', localized) && optional(props, 'buttonLabel', localized)
      && optional(props, 'homeAction', v => member(v, ['offers', 'services', 'post', 'events', 'link']))
      && (props.homeAction === 'link' ? member(props.placement, ['promo', 'aboveTrending', 'belowTrending']) && validHomeLink(props.linkUrl) : !has(props, 'linkUrl'))
      && member(props.media, ['bundled', 'image', 'lottie', 'none']) && member(props.bundled, ['offers', 'post', 'events', 'services', 'support', 'moreDeals'])
      && (member(props.media, ['image', 'lottie']) ? id(props.assetId) : !has(props, 'assetId'))
      && (props.placement === 'offer' ? id(props.offerId) : !has(props, 'offerId'))
      && optional(props, 'limit', v => integer(v, 1, 40)) && optional(props, 'height', v => integer(v, 80, 240))
      && optional(props, 'speed', v => typeof v === 'number' && v >= 0.25 && v <= 2)
      && optional(props, 'loopCount', v => integer(v, 1, 3)) && optional(props, 'fit', v => member(v, ['cover', 'contain'])) && optional(props, 'showCopy', v => typeof v === 'boolean'); break;
    case 'text': valid = keys(props, ['text', 'variant', 'colorToken', 'backgroundToken']) && localized(props.text)
      && optional(props, 'variant', (v) => member(v, ['heading', 'body', 'caption'])) && section(props); break;
    case 'heroBanner': valid = keys(props, ['title', 'subtitle', 'buttonLabel', 'action', 'colorToken', 'backgroundToken', 'imageAssetId', 'imageHeight'])
      && localized(props.title) && optional(props, 'subtitle', localized) && optional(props, 'buttonLabel', localized)
      && optional(props, 'action', (v) => member(v, UI_ACTIONS)) && has(props, 'buttonLabel') === has(props, 'action') && section(props)
      && optional(props, 'imageAssetId', id) && optional(props, 'imageHeight', (v) => integer(v, 80, 320)); break;
    case 'image': valid = keys(props, ['assetId', 'alt', 'height', 'fit']) && id(props.assetId) && localized(props.alt)
      && optional(props, 'height', (v) => integer(v, 64, 480)) && optional(props, 'fit', (v) => member(v, ['contain', 'cover'])); break;
    case 'icon': valid = keys(props, ['name', 'size', 'label', 'colorToken', 'backgroundToken']) && member(props.name, uiVisual.icons)
      && optional(props, 'size', (v) => integer(v, 16, 96)) && optional(props, 'label', localized) && section(props); break;
    case 'offerRail': valid = pageKey === 'offersHome' && keys(props, ['source', 'variant', 'limit']) && member(props.source, ['nearby', 'showcase'])
      && optional(props, 'variant', (v) => member(v, ['standard', 'compact'])) && optional(props, 'limit', (v) => integer(v, 1, 12)); break;
    case 'spacer': valid = keys(props, ['height']) && integer(props.height, 0, 48); break;
    case 'actionLink': valid = keys(props, ['label', 'action']) && localized(props.label) && member(props.action, UI_ACTIONS); break;
    case 'illustration': valid = keys(props, ['image', 'alt', 'height', 'fit']) && member(props.image, ['welcome', 'offers', 'services', 'business']) && localized(props.alt) && optional(props, 'height', (v) => integer(v, 96, 240)) && optional(props, 'fit', (v) => member(v, ['contain', 'cover'])); break;
    case 'lottie': valid = keys(props, ['assetId', 'fallback', 'speed', 'loop', 'loopCount', 'width', 'height', 'alignment'])
      && id(props.assetId) && localized(props.fallback) && optional(props, 'speed', (v) => typeof v === 'number' && v >= 0.25 && v <= 2)
      && optional(props, 'loop', (v) => typeof v === 'boolean') && optional(props, 'loopCount', (v) => integer(v, 1, 3))
      && optional(props, 'width', (v) => integer(v, 32, 320)) && optional(props, 'height', (v) => integer(v, 32, 320))
      && optional(props, 'alignment', (v) => member(v, ['left', 'center', 'right'])); break;
  }
  return valid ? value as UIBlock : null;
}

const luminance = (hex: string) => {
  const parts = hex.slice(1).match(/../g)!.map((part) => parseInt(part, 16) / 255).map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  return parts[0] * 0.2126 + parts[1] * 0.7152 + parts[2] * 0.0722;
};
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};
export function isUITheme(value: unknown): value is UITheme {
  if (!object(value) || !keys(value, ['schemaVersion', 'kind', 'key', 'modes']) || value.schemaVersion !== 1 || value.kind !== 'theme' || value.key !== 'global'
    || !object(value.modes) || !keys(value.modes, ['light', 'dark'])) return false;
  for (const mode of ['light', 'dark'] as const) {
    const config = value.modes[mode];
    if (!object(config) || !keys(config, ['colors']) || !object(config.colors) || !keys(config.colors, UI_COLOR_KEYS)
      || Object.values(config.colors).some((v) => typeof v !== 'string' || !/^#[a-fA-F0-9]{6}$/.test(v))) return false;
    const palette = { ...palettes[mode], ...config.colors };
    for (const fg of ['text', 'textSecondary'] as const) for (const bg of ['background', 'surface'] as const) {
      if (contrast(palette[fg], palette[bg]) < 4.5) return false;
    }
  }
  return true;
}
const fail = (): never => { throw new Error('Invalid or unsupported dynamic UI configuration'); };
const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export function parseUIRuntime(input: unknown): UIRuntime {
  if (!object(input) || !safeJSON(input) || jsonBytes(JSON.stringify(input)) > UI_MAX_BYTES || !keys(input, ['success', 'releaseId', 'generation', 'schemaVersion',
    'rendererVersion', 'enabled', 'useNativeFallback', 'fallbackReason', 'serverTime', 'refreshAfter', 'validUntil', 'base', 'overlay', 'assets', 'campaign', 'nextTransitionAt'])) return fail();
  if (input.success !== true || input.schemaVersion !== 1 || !member(input.rendererVersion, [1, 2, 3, 4, 5, 6]) || !integer(input.generation, 0)
    || !(input.releaseId === null || id(input.releaseId)) || typeof input.enabled !== 'boolean' || input.useNativeFallback !== !input.enabled
    || !timestamp(input.serverTime) || !timestamp(input.refreshAfter) || !timestamp(input.validUntil) || input.overlay !== null
    || !object(input.assets) || Object.keys(input.assets).length > uiVisual.maxAssets) return fail();
  for (const [key, asset] of Object.entries(input.assets)) {
    if (!id(key) || !object(asset) || !keys(asset, ['id', 'sha256', 'width', 'height', 'fps', 'duration', 'size', 'kind', 'mimeType']) || asset.id !== key
      || typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256) || !integer(asset.width, 1, 2048) || !integer(asset.height, 1, 2048)
      || !integer(asset.size, 1, asset.kind === 'image' ? uiVisual.imageMaxBytes : UI_ANIMATION_MAX_BYTES)) return fail();
    if (asset.kind === 'image') {
      if (Number(input.rendererVersion) < 4 || !member(asset.mimeType, ['image/png', 'image/jpeg']) || asset.fps !== 0 || asset.duration !== 0) return fail();
    } else if ((asset.kind !== undefined && asset.kind !== 'lottie') || has(asset, 'mimeType') || typeof asset.fps !== 'number' || asset.fps <= 0 || asset.fps > 60
      || typeof asset.duration !== 'number' || asset.duration <= 0 || asset.duration > 30) return fail();
  }
  if (input.enabled ? input.fallbackReason !== null || !id(input.releaseId) || input.generation === 0
    : !member(input.fallbackReason, ['not_published', 'unsupported_renderer', 'disabled', 'unavailable'])) return fail();
  const lifetime = Date.parse(input.validUntil) - Date.parse(input.serverTime);
  if (input.nextTransitionAt != null && (!timestamp(input.nextTransitionAt) || Date.parse(input.nextTransitionAt) <= Date.parse(input.serverTime)
    || Date.parse(input.validUntil) > Date.parse(input.nextTransitionAt))) return fail();
  if (input.campaign != null) {
    const c = input.campaign;
    if (!object(c) || !keys(c, ['id', 'identifier', 'version', 'releaseId', 'startsAt', 'endsAt']) || !id(c.id) || !id(c.releaseId)
      || typeof c.identifier !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(c.identifier) || !integer(c.version, 1)
      || !timestamp(c.startsAt) || !timestamp(c.endsAt) || Date.parse(c.startsAt) > Date.parse(input.serverTime)
      || Date.parse(c.endsAt) <= Date.parse(input.serverTime) || Date.parse(input.validUntil) > Date.parse(c.endsAt) || !input.enabled) return fail();
  }
  const refresh = Date.parse(input.refreshAfter) - Date.parse(input.serverTime);
  if (lifetime <= 0 || lifetime > 7 * 86400_000 || refresh < 0 || refresh > 60_000 || !object(input.base)
    || !keys(input.base, ['pages', 'theme']) || !isUITheme(input.base.theme) || !object(input.base.pages)
    || !keys(input.base.pages, UI_PAGE_KEYS) || Object.keys(input.base.pages).length !== UI_PAGE_KEYS.length) return fail();
  const referenced = new Set<string>();
  for (const key of UI_PAGE_KEYS) {
    const page = input.base.pages[key];
    if (!object(page) || !keys(page, ['schemaVersion', 'rendererVersion', 'kind', 'key', 'slots', 'presentation', 'homeHeader']) || page.schemaVersion !== 1
      || !member(page.rendererVersion, [1, 2, 3, 4, 5, 6]) || Number(page.rendererVersion) > Number(input.rendererVersion) || page.kind !== 'page' || page.key !== key || !object(page.slots)
      || !keys(page.slots, ['beforeContent', 'afterContent']) || !Array.isArray(page.slots.beforeContent) || !Array.isArray(page.slots.afterContent)) return fail();
    if (has(page, 'presentation') && (Number(page.rendererVersion) < 3 || !isUIPresentation(page.presentation, key))) return fail();
    if (has(page, 'homeHeader') && (key !== 'offersHome' || Number(page.rendererVersion) < 6 || !isHomeHeader(page.homeHeader))) return fail();
    const blocks = [...page.slots.beforeContent, ...page.slots.afterContent];
    if (blocks.some((block) => block.type === 'illustration') && Number(page.rendererVersion) < 3) return fail();
    if (blocks.length > 40 || blocks.some((block) => !parseUIBlock(block, key)) || new Set(blocks.map((block) => block.id)).size !== blocks.length) return fail();
    if (Number(page.rendererVersion) < 4 && blocks.some((block) => needsVisualRenderer(block as UIBlock))) return fail();
    if (Number(page.rendererVersion) < 2 && blocks.some((block) => has(block, 'hidden'))) return fail();
    const nativeHome = blocks.filter(block => block.type === 'homeCard');
    if (nativeHome.length && Number(page.rendererVersion) < 5) return fail();
    if (nativeHome.some(block => block.props.homeAction === 'link') && Number(page.rendererVersion) < 6) return fail();
    if (nativeHome.filter(b => b.props.placement === 'promo').length > 8 || nativeHome.filter(b => b.props.placement === 'offer').length > 12) return fail();
    for (const placement of ['aboveTrending', 'belowTrending', 'trending']) if (nativeHome.filter(b => b.props.placement === placement).length > 1) return fail();
    const offerIds = nativeHome.filter(b => b.props.placement === 'offer').map(b => b.props.offerId);
    if (new Set(offerIds).size !== offerIds.length) return fail();
    const animations = blocks.filter((block) => block.type === 'lottie');
    if (animations.length > 1 || (animations.length && (Number(page.rendererVersion) < 2 || (key !== 'offersHome' && Number(page.rendererVersion) < 3)))) return fail();
    for (const block of blocks as UIBlock[]) {
      const assetId = blockAssetId(block);
      if (!assetId) continue;
      const asset = input.assets[assetId];
      if (!object(asset) || ((block.type === 'lottie' || (block.type === 'homeCard' && block.props.media === 'lottie')) === (asset.kind === 'image'))) return fail();
      referenced.add(assetId);
    }
    for (const mode of ['light', 'dark'] as const) {
      const palette = { ...palettes[mode], ...input.base.theme.modes[mode].colors };
      for (const item of blocks as UIBlock[]) if (item.type === 'text' || item.type === 'heroBanner' || item.type === 'icon' || item.type === 'homeCard') {
        if (contrast(item.style?.color || palette[item.type === 'homeCard' ? 'text' : item.props.colorToken || 'text'], item.style?.backgroundColor || palette[item.type === 'homeCard' ? 'surface' : item.props.backgroundToken || 'surface']) < 4.5) return fail();
      }
    }
  }
  if (referenced.size !== Object.keys(input.assets).length) return fail();
  return freeze(JSON.parse(JSON.stringify(input)) as UIRuntime);
}

export function defaultUIRuntime(now = Date.now()): UIRuntime {
  const pages = UI_PAGE_KEYS.reduce((result, key) => {
    result[key] = { schemaVersion: 1, rendererVersion: 1, kind: 'page', key, slots: { beforeContent: [], afterContent: [] } };
    return result;
  }, {} as UIRuntime['base']['pages']);
  return freeze({ success: true, releaseId: null, generation: 0, schemaVersion: 1, rendererVersion: 1, enabled: false, useNativeFallback: true,
    fallbackReason: 'not_published', serverTime: new Date(now).toISOString(), refreshAfter: new Date(now + 60_000).toISOString(),
    validUntil: new Date(now + 7 * 86400_000).toISOString(), base: {
      pages,
      theme: { schemaVersion: 1, kind: 'theme', key: 'global', modes: { light: { colors: {} }, dark: { colors: {} } } },
    }, overlay: null, assets: {} });
}
