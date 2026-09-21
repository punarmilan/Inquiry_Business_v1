const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');

// Load the production picker with the native image picker replaced by a stub.
function loadPicker(launchImageLibraryAsync) {
  const { outputText } = ts.transpileModule(read('services/posterUpload.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: () => ({ launchImageLibraryAsync }) });
  return module.exports.pickPosterImage;
}

// Pull one exported constant out of the design config without loading its image assets.
function configExport(name) {
  const source = read('config/offerCardDesigner.ts');
  const ast = ts.createSourceFile('design.ts', source, ts.ScriptTarget.Latest, true);
  let expression;
  ast.forEachChild((node) => {
    if (ts.isVariableStatement(node)) node.declarationList.declarations.forEach((declaration) => {
      if (declaration.name.getText(ast) === name) expression = declaration.initializer;
    });
  });
  assert.ok(expression, name);
  const code = ts.transpileModule('(' + expression.getText(ast) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(code, {
    Math,
    POSTER_UPLOAD_TEMPLATE_ID: 'poster-upload',
    DEFAULT_OFFER_CARD_DESIGN: { templateId: 'default', avatarId: '', primaryColor: '#112233', secondaryColor: '#445566', layout: 'right', dynamicFields: {} },
  });
}

const designBuilder = () => configExport('makePosterUploadDesign');

test('poster design keeps the poster aspect ratio on one full-size image layer', () => {
  const design = designBuilder()({ width: 1000, height: 1500 });
  assert.equal(design.templateId, 'poster-upload');
  assert.equal(design.templateSource, 'custom');
  assert.equal(design.canvas.width, 1080);
  assert.equal(design.canvas.height, 1620);
  assert.equal(design.canvas.elements.length, 1);
  const layer = design.canvas.elements[0];
  assert.equal(layer.field, 'imageUrls');
  assert.deepEqual([layer.x, layer.y, layer.width, layer.height], [0, 0, 1080, 1620]);
  // The offer API requires these to be present as six-digit hex colours.
  assert.match(design.primaryColor, /^#[0-9a-f]{6}$/i);
  assert.match(design.secondaryColor, /^#[0-9a-f]{6}$/i);
});

test('poster canvas stays inside the API canvas limits for extreme images and unknown sizes', () => {
  const build = designBuilder();
  for (const size of [{ width: 100, height: 5000 }, { width: 5000, height: 100 }, { width: 0, height: 0 }, undefined]) {
    const { canvas } = build(size);
    assert.ok(canvas.height > 0 && canvas.height <= 10000, JSON.stringify(size));
    assert.ok(canvas.width > 0 && canvas.width <= 10000, JSON.stringify(size));
  }
});

test('picker returns null when the user cancels or picks nothing', async () => {
  assert.equal(await loadPicker(async () => ({ canceled: true, assets: null }))(), null);
  assert.equal(await loadPicker(async () => ({ canceled: false, assets: [] }))(), null);
});

test('picker builds an API-ready data URL and keeps supported image types', async () => {
  const pick = loadPicker(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 800, height: 1000, mimeType: 'image/png' }] }));
  const { poster } = await pick();
  assert.equal(poster.dataUrl, 'data:image/png;base64,QUJD');
  assert.equal(poster.width, 800);
  assert.equal(poster.height, 1000);
});

test('picker labels unsupported or unknown image types as jpeg so the API accepts them', async () => {
  for (const mimeType of ['image/heic', undefined, null]) {
    const pick = loadPicker(async () => ({ canceled: false, assets: [{ base64: 'QUJD', width: 10, height: 10, mimeType }] }));
    assert.equal((await pick()).poster.dataUrl, 'data:image/jpeg;base64,QUJD');
  }
});

test('picker rejects unreadable, oversized and failing picks with a message instead of throwing', async () => {
  const missing = await loadPicker(async () => ({ canceled: false, assets: [{ width: 10, height: 10 }] }))();
  assert.match(missing.error, /could not be read/i);
  const huge = await loadPicker(async () => ({ canceled: false, assets: [{ base64: 'A'.repeat(7_000_000), width: 10, height: 10, mimeType: 'image/jpeg' }] }))();
  assert.match(huge.error, /too large/i);
  const failed = await loadPicker(async () => { throw new Error('native failure'); })();
  assert.match(failed.error, /could not be opened/i);
});

test('poster offers are recognised only by the poster template id', () => {
  const isPoster = configExport('isPosterUploadOffer');
  assert.equal(isPoster({ cardDesign: { templateId: 'poster-upload' } }), true);
  assert.equal(isPoster({ cardDesign: { templateId: 'custom' } }), false);
  assert.equal(isPoster({ cardDesign: {} }), false);
  assert.equal(isPoster({ cardDesign: null }), false);
  assert.equal(isPoster({}), false);
});

test('poster offer placeholders satisfy the API rules and carry no price or discount', () => {
  const details = configExport('makePosterOfferDetails');
  const pizza = details('Pizza hub');
  assert.equal(pizza.title, 'Pizza hub offer');
  assert.match(pizza.description, /Pizza hub/);
  assert.deepEqual([pizza.originalPrice, pizza.offerPrice, pizza.discountPercentage], [0, 0, 0]);
  // API bounds: title 3-160 characters, description 5-4000, business names 2-140.
  for (const name of ['AB', 'x'.repeat(140)]) {
    const { title, description } = details(name);
    assert.ok(title.length >= 3 && title.length <= 160, name.length + ' title');
    assert.ok(description.length >= 5 && description.length <= 4000, name.length + ' description');
  }
});
