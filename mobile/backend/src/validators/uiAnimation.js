const { createHash } = require('node:crypto');
const ApiError = require('../utils/ApiError');
const MAX_ANIMATION_BYTES = 10 * 1024 * 1024;
const invalid = () => { throw new ApiError(422, 'Use a self-contained vector Lottie JSON: at most 10 MB, 2048 px, 60 fps, 30 seconds and 100 layers; no expressions, effects, text, media or external resources', 'UI_ANIMATION_INVALID'); };

function validateAnimation(input) {
  let count = 0;
  const walk = (value, depth = 0, key = '') => {
    if (++count > 50000 || depth > 32) invalid();
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number') { if (!Number.isFinite(value) || Math.abs(value) > 10000000) invalid(); return; }
    if (typeof value === 'string') {
      if (!['v', 'nm', 'mn', 'ln', 'refId', 'id', 'ty', 'sc'].includes(key) || value.length > 500 || /[<>]|javascript:|https?:|data:|\{\{/i.test(value)) invalid();
      return;
    }
    if (!value || typeof value !== 'object' || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) invalid();
    for (const [name, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype', 'ef', 'fonts', 'chars', 'expression', 'url', 'href'].includes(name) || name.startsWith('$') || name.includes('.')) invalid();
      walk(child, depth + 1, name);
    }
  };
  walk(input);
  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_ANIMATION_BYTES || !/^\d+\.\d+\.\d+$/.test(input.v)
    || !Number.isInteger(input.w) || input.w < 1 || input.w > 2048 || !Number.isInteger(input.h) || input.h < 1 || input.h > 2048
    || !(input.fr > 0 && input.fr <= 60) || !(input.op > input.ip) || (input.op - input.ip) / input.fr > 30 || !Array.isArray(input.layers)) invalid();
  const assets = input.assets || [];
  if (!Array.isArray(assets) || assets.length > 100) invalid();
  const byId = new Map();
  for (const asset of assets) {
    if (!asset.id || byId.has(asset.id) || !Array.isArray(asset.layers) || Object.keys(asset).some((key) => !['id', 'layers', 'nm'].includes(key))) invalid();
    byId.set(asset.id, asset);
  }
  let layers = 0;
  const inspect = (items, lineage = []) => {
    if (lineage.length > 4) invalid();
    for (const layer of items) {
      if (++layers > 100 || ![0, 4].includes(layer.ty)) invalid();
      if (layer.ty === 0) {
        if (!byId.has(layer.refId) || lineage.includes(layer.refId)) invalid();
        inspect(byId.get(layer.refId).layers, [...lineage, layer.refId]);
      }
    }
  };
  inspect(input.layers);
  for (const asset of assets) inspect(asset.layers, [asset.id]);
  const animation = JSON.parse(JSON.stringify(input));
  const bytes = JSON.stringify(animation);
  return { animation, sha256: createHash('sha256').update(bytes).digest('hex'), size: Buffer.byteLength(bytes), width: input.w, height: input.h,
    fps: input.fr, duration: (input.op - input.ip) / input.fr };
}
module.exports = { validateAnimation, MAX_ANIMATION_BYTES };
