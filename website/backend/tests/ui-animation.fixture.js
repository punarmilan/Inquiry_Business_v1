// A vector animation with an exact UTF-8 JSON size, within the 50,000-node budget.
// Multibyte names make byte-boundary tests independent of JS string length.
function sizedAnimation(bytes) {
  const animation = { v: '5.7.4', nm: '', w: 100, h: 100, fr: 30, ip: 0, op: 30, assets: [], layers: [{ ty: 4, shapes: [] }] };
  const group = { ty: 'gr', nm: 'é'.repeat(500), it: [] };
  const baseBytes = Buffer.byteLength(JSON.stringify(animation));
  const groupBytes = Buffer.byteLength(JSON.stringify(group)) + 1;
  const count = Math.floor((bytes - baseBytes + 1) / groupBytes);
  animation.layers[0].shapes = Array.from({ length: count }, () => ({ ...group, it: [] }));
  const padding = bytes - Buffer.byteLength(JSON.stringify(animation));
  animation.nm = '€'.repeat(Math.floor(padding / 3)) + 'x'.repeat(padding % 3);
  if (Buffer.byteLength(JSON.stringify(animation)) !== bytes || animation.nm.length > 500) throw new Error('Invalid sized animation fixture');
  return animation;
}
module.exports = { sizedAnimation };
