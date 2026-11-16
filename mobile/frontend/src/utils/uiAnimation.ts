import { jsonBytes } from './dynamicUI';
import { UI_ANIMATION_MAX_BYTES } from './uiAnimationLimits';

// Shared JSON contract: usable by both native playback and the web editor.
export interface AnimationObject {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm?: string;
  ddd?: number;
  assets: any[];
  layers: any[];
  markers?: any[];
}

/** Same self-contained vector subset accepted by the upload API. */
export function parseUIAnimation(input: unknown): AnimationObject {
  const fail = (): never => { throw new Error('Unsupported animation'); };
  let count = 0;
  const walk = (value: unknown, depth = 0, key = '') => {
    if (++count > 50000 || depth > 32) fail();
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number') { if (!Number.isFinite(value) || Math.abs(value) > 10000000) fail(); return; }
    if (typeof value === 'string') {
      if (!['v', 'nm', 'mn', 'ln', 'refId', 'id', 'ty', 'sc'].includes(key) || value.length > 500 || /[<>]|javascript:|https?:|data:|\{\{/i.test(value)) fail();
      return;
    }
    if (!value || typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) fail();
    for (const [name, child] of Object.entries(value as object)) {
      if (['__proto__', 'constructor', 'prototype', 'ef', 'fonts', 'chars', 'expression', 'url', 'href'].includes(name) || name.startsWith('$') || name.includes('.')) fail();
      walk(child, depth + 1, name);
    }
  };
  walk(input);
  const value = input as AnimationObject;
  if (!value || jsonBytes(JSON.stringify(value)) > UI_ANIMATION_MAX_BYTES || !/^\d+\.\d+\.\d+$/.test(value.v)
    || !Number.isInteger(value.w) || value.w < 1 || value.w > 2048 || !Number.isInteger(value.h) || value.h < 1 || value.h > 2048
    || !(value.fr > 0 && value.fr <= 60) || !(value.op > value.ip) || (value.op - value.ip) / value.fr > 30 || !Array.isArray(value.layers)) fail();
  const assets = value.assets || [];
  if (!Array.isArray(assets) || assets.length > 100) fail();
  const byId = new Map();
  for (const asset of assets) {
    if (!asset.id || byId.has(asset.id) || !Array.isArray(asset.layers) || Object.keys(asset).some((key) => !['id', 'layers', 'nm'].includes(key))) fail();
    byId.set(asset.id, asset);
  }
  let layers = 0;
  const inspect = (items: AnimationObject['layers'], lineage: string[] = []) => {
    if (lineage.length > 4) fail();
    for (const layer of items) {
      if (++layers > 100 || ![0, 4].includes(layer.ty)) fail();
      if (layer.ty === 0) {
        if (!byId.has(layer.refId) || lineage.includes(layer.refId)) fail();
        inspect(byId.get(layer.refId).layers, [...lineage, layer.refId]);
      }
    }
  };
  inspect(value.layers);
  for (const asset of assets) inspect(asset.layers, [asset.id]);
  return { ...value, assets };
}
