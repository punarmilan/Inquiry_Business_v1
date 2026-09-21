const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../node_modules/typescript');
const { templateCreate } = require('../../backend/src/validators/hyperlocal.validator');

const adminRoot = path.resolve(__dirname, '..');
const artifactRoot = path.resolve(adminRoot, '../../artifacts/local-business-36');
const packPath = path.join(adminRoot, 'src/data/local-business-36-template-pack.json');
function loadSource(source, globals = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, ...globals }, { timeout: 5000 });
  return module.exports;
}
const jsonTools = loadSource(fs.readFileSync(path.join(adminRoot, 'src/utils/offerTemplateJsonTools.ts'), 'utf8'));
const schemaTools = loadSource(fs.readFileSync(path.join(adminRoot, 'src/utils/templateSchema.ts'), 'utf8'));
const page = fs.readFileSync(path.join(adminRoot, 'src/pages/hyperlocal/OfferTemplatesPage.tsx'), 'utf8');
const helperStart = page.indexOf('const isJsonObject =');
const helperEnd = page.indexOf('const TemplateCardPreview =');
const normalizeStart = page.indexOf('const normalizeTemplateImport =');
const normalizeEnd = page.indexOf('const MAX_ASSET_BYTES =');
assert.ok(helperStart >= 0 && helperEnd > helperStart && normalizeStart >= 0 && normalizeEnd > normalizeStart, 'Admin import functions could not be located.');
const { normalize } = loadSource(`${page.slice(helperStart, helperEnd)}\n${page.slice(normalizeStart, normalizeEnd)}\nexports.normalize = normalizeTemplateImport;`, { getDynamicFieldName: schemaTools.getDynamicFieldName });

function validatePack() {
  const templates = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  assert.equal(templates.length, 36);
  assert.equal(new Set(templates.map((item) => item.slug)).size, 36);
  const counts = {};
  const normalized = templates.map((template, index) => {
    counts[template.category] = (counts[template.category] || 0) + 1;
    jsonTools.assertPublishableTemplateJson(template, index);
    const rawCheck = templateCreate.validate({ body: template }, { abortEarly: false });
    if (rawCheck.error) throw new Error(`${template.name}: ${rawCheck.error.message}`);
    const value = normalize(template, index);
    jsonTools.assertPublishableTemplateJson(value, index);
    const apiCheck = templateCreate.validate({ body: value }, { abortEarly: false });
    if (apiCheck.error) throw new Error(`${template.name} after admin import: ${apiCheck.error.message}`);
    // The admin normalizer clamps geometry. A valid new pack needs no clamping.
    value.canvas.elements.forEach((element, i) => {
      for (const key of ['x', 'y', 'width', 'height']) assert.equal(element[key], template.canvas.elements[i][key], `${template.slug}/${element.id}: ${key} would be clamped`);
    });
    return value;
  });
  assert.equal(Object.keys(counts).length, 6);
  for (const count of Object.values(counts)) assert.equal(count, 6);
  return { templates, normalized, counts };
}

module.exports = { validatePack, artifactRoot, packPath };
