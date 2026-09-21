const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/screens/offers/heroRotation.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleRef = { exports: {} };
new Function('module', 'exports', compiled)(moduleRef, moduleRef.exports);
const { buildHeroRotationPages } = moduleRef.exports;

test('every offer becomes large and a large poster moves to a small slot', () => {
  for (const count of [2, 3, 4, 5, 6, 12]) {
    const offers = Array.from({ length: count }, (_, index) => `poster-${index}`);
    const pages = buildHeroRotationPages(offers);
    assert.equal(pages.length, count);
    assert.deepEqual(pages.map((page) => page[0]), offers);
    for (let index = 0; index < pages.length; index += 1) {
      const current = pages[index];
      const next = pages[(index + 1) % pages.length];
      assert.equal(current.length, Math.min(count, 3));
      assert.equal(new Set(current).size, current.length);
      assert.equal(current[1], next[0]);
      assert.ok(next.slice(1).includes(current[0]));
    }
  }
});

test('zero and one offer have no duplicate or empty cards', () => {
  assert.deepEqual(buildHeroRotationPages([]), []);
  assert.deepEqual(buildHeroRotationPages(['only']), [['only']]);
});
