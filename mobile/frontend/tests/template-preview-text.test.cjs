const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/config/offerCardDesigner.ts'), 'utf8')
  .replace(/^import .*$/gm, '')
  // The avatar sprite sheets are PNG requires that node cannot load.
  .replace(/const avatarSheets = \[[\s\S]*?\] as ImageSourcePropType\[\];/, 'const avatarSheets = [1, 2, 3, 4, 5];');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const loaded = { exports: {} };
vm.runInNewContext(outputText, { module: loaded, exports: loaded.exports, require: () => ({}), Date, Math, Number, String, Object, Array, JSON, Boolean, RegExp });
const { resolveTemplatePreviewText, resolveTemplateElementValue, resolveTemplateImageValue } = loaded.exports;

const LIBRARY_ONLY = {}; // the template library has no offer, so nothing fills runtime fields

test('the template library never shows raw {{tokens}} to the user', () => {
  // A published card supplies businessName; the library thumbnail cannot, and
  // showing "@{{businessName}}" on a card would leak template syntax into the UI.
  assert.equal(resolveTemplatePreviewText('@{{businessName}}', undefined, LIBRARY_ONLY), '');
  assert.equal(resolveTemplatePreviewText('Only {{spotsLeft}} left', undefined, LIBRARY_ONLY), '');
  assert.equal(resolveTemplatePreviewText('{{headline}}', 'headline', LIBRARY_ONLY), '');
});

test('text that can be resolved is shown in full', () => {
  assert.equal(resolveTemplatePreviewText('@{{businessName}}', undefined, { businessName: 'Pizza hub' }), '@Pizza hub');
  assert.equal(resolveTemplatePreviewText('PIZZA SPECIAL', undefined, LIBRARY_ONLY), 'PIZZA SPECIAL');
  assert.equal(resolveTemplatePreviewText('Starter copy', 'title', { title: 'Get 2 pizza' }), 'Get 2 pizza');
  assert.equal(resolveTemplatePreviewText('', undefined, LIBRARY_ONLY), '');
});

test('the editor keeps showing the raw token, so a missing binding stays visible there', () => {
  // Only the preview hides it; the editing surface must not silently swallow a
  // binding the business owner still has to fill in.
  assert.equal(resolveTemplateElementValue('@{{businessName}}', undefined, LIBRARY_ONLY), '@{{businessName}}');
});

test('images already followed this rule, and still do', () => {
  assert.equal(resolveTemplateImageValue('{{foodImage}}', 'foodImage', LIBRARY_ONLY), '');
  assert.equal(resolveTemplateImageValue('https://cdn.example.com/a.jpg', 'imageUrls', LIBRARY_ONLY), 'https://cdn.example.com/a.jpg');
});
