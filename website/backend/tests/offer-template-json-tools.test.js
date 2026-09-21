const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
// TypeScript only ships with the admin console, which is where the util lives.
const ts = require(path.join(root, 'admin-frontend/node_modules/typescript'));
const source = fs.readFileSync(path.join(root, 'admin-frontend/src/utils/offerTemplateJsonTools.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const loaded = { exports: {} };
vm.runInNewContext(outputText, { module: loaded, exports: loaded.exports, JSON, Object, Array, Set, Error, RegExp, String, Number, Boolean });
const { assertPublishableTemplateJson } = loaded.exports;

const PHOTO = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=85';

const element = (overrides = {}) => ({
  id: 'layer-1', type: 'text', text: 'PIZZA SPECIAL', x: 10, y: 10, width: 100, height: 40, editable: true, ...overrides,
});
const template = (overrides = {}) => ({
  name: 'Pizza promo',
  canvas: { width: 1080, height: 1350, elements: [element()], ...(overrides.canvas || {}) },
  ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'canvas')),
});
const publish = (value) => assertPublishableTemplateJson(value, 0);
const rejects = (value, pattern) => assert.throws(() => publish(value), pattern);

test('a complete canvas template publishes', () => {
  publish(template({
    canvas: {
      width: 1080, height: 1350,
      elements: [element(), element({ id: 'photo', type: 'image', field: 'imageUrls', key: 'imageUrls', src: PHOTO })],
    },
    editableFields: [{ key: 'imageUrls', type: 'image' }],
  }));
});

test('a {{token}} nobody fills in is rejected, whatever layer it hides in', () => {
  // This is exactly how "Crispy Juicy Food Offer" shipped a hole where its photo should be.
  rejects(
    template({ canvas: { width: 1080, height: 1350, elements: [element({ id: 'food-image', type: 'image', src: '{{foodImage}}' })] } }),
    /\{\{foodImage\}\} but nothing fills that in/
  );
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element({ text: 'Only {{priceTag}} today' })] } }), /\{\{priceTag\}\}/);
  rejects(
    template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', content: { src: '{{heroShot}}' }, src: PHOTO })] } }),
    /\{\{heroShot\}\}/
  );
});

test('a {{token}} is accepted once something supplies it', () => {
  const withToken = (extra) => template({ canvas: { width: 1080, height: 1350, elements: [element({ id: 'food-image', type: 'image', src: '{{foodImage}}' })] }, ...extra });
  publish(withToken({ dynamicFields: { foodImage: PHOTO } }));
  publish(withToken({ editableFields: [{ key: 'foodImage', type: 'image' }] }));
});

test('tokens the app itself fills in need no declaration', () => {
  for (const field of ['title', 'description', 'imageUrls', 'businessName', 'businessLogo', 'discount', 'offerPrice', 'originalPrice', 'buttonText', 'expiresAt']) {
    publish(template({ canvas: { width: 1080, height: 1350, elements: [element({ text: `Now {{${field}}}` })] } }));
  }
});

test('an image that only a developer machine can load is rejected', () => {
  // The exact shape that broke "Weekend service offer" on every phone.
  rejects(
    template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: 'http://localhost:5001/hyperlocal/template-assets/6aa13b1de2fd' })] } }),
    /local development address/
  );
  for (const host of ['http://127.0.0.1:5001/a.png', 'http://192.168.1.7:5001/a.png', 'http://10.0.2.2/a.png', 'https://localhost:5001/a.png']) {
    rejects(template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: host })] } }), /local development address/);
  }
});

test('plain http and non-web sources are rejected, https and uploaded images pass', () => {
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: 'http://cdn.example.com/a.png' })] } }), /uses http:\/\//);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: 'ftp://example.com/a.png' })] } }), /must be an https/);
  publish(template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: PHOTO })] } }));
  publish(template({ canvas: { width: 1080, height: 1350, elements: [element({ type: 'image', src: 'data:image/png;base64,iVBORw0KGgo=' })] } }));
});

test('the preview and canvas background are checked the same way', () => {
  rejects(template({ previewUrl: 'http://localhost:5173/preview.png' }), /previewUrl points at a local development address/);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element()], backgroundImageUrl: 'http://localhost:5001/bg.png' } }), /backgroundImageUrl points at a local development address/);
  // A legacy template with no canvas is still checked through its preview.
  rejects({ name: 'Legacy', canvas: null, previewUrl: 'http://localhost:5001/p.png' }, /local development address/);
  publish({ name: 'Legacy', canvas: null, previewUrl: PHOTO });
});

test('the existing structural rules still hold', () => {
  rejects(template({ canvas: { width: 0, height: 1350, elements: [] } }), /width and height must be positive/);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element(), element()] } }), /duplicates id/);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [{ ...element(), editable: undefined }] } }), /needs editable/);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [element({ field: 'nope', text: 'x' })] } }), /no matching editable\/dynamic field/);
  rejects(template({ canvas: { width: 1080, height: 1350, elements: [] } }), /is blank/);
});
