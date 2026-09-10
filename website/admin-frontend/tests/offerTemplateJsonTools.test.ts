import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertPublishableTemplateJson,
  assertSupportedInputElementTypes,
  formatTemplateJson,
  getTemplateJsonEntries,
  insertAssetIntoTemplateJson,
  replaceTemplateAssetUrl,
} from '../src/utils/offerTemplateJsonTools.ts';

const readJson = (name: string) => JSON.parse(fs.readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8')) as unknown;
const v2 = readJson('template-schema-v2.example.json');
const foodPack = readJson('food-offer-template-pack.json');
const legacy = readJson('offer-template-presets.json');

const validateEntries = (value: unknown) => {
  const entries = getTemplateJsonEntries(value);
  entries.forEach((entry, index) => {
    assertSupportedInputElementTypes(entry, index);
    const normalizedDefaults = JSON.parse(JSON.stringify(entry)) as Record<string, unknown>;
    const canvas = normalizedDefaults.canvas as { elements?: Array<Record<string, unknown>> } | undefined;
    canvas?.elements?.forEach((element) => {
      if (typeof element.editable !== 'boolean') element.editable = true;
    });
    assertPublishableTemplateJson(normalizedDefaults, index);
  });
  return entries;
};

test('all existing v2, Food pack, and legacy loaders remain valid', () => {
  assert.equal(validateEntries(v2).length, 1);
  assert.equal(validateEntries(foodPack).length, 10);
  assert.ok(validateEntries(legacy).length > 0);
});

test('JSON formatting accepts valid input and rejects invalid input', () => {
  assert.equal(formatTemplateJson('{"name":"A"}'), '{\n  "name": "A"\n}');
  assert.throws(() => formatTemplateJson('{bad json}'));
});

test('schema validation rejects bad types, missing IDs, geometry, content and editable flags', () => {
  const base = {
    name: 'Invalid',
    editableFields: [],
    dynamicFields: {},
    canvas: { width: 1080, height: 1350, elements: [] as unknown[] },
  };
  base.canvas.elements = [{ id: 'bad', type: 'video', x: 0, y: 0, width: 10, height: 10, editable: true }];
  assert.throws(() => assertSupportedInputElementTypes(base, 0), /unsupported type/);
  base.canvas.elements = [{ type: 'image', x: 0, y: 0, width: 10, height: 10, editable: true, src: 'https://example.test/a.png' }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /needs an id/);
  base.canvas.elements = [{ id: 'image', type: 'image', x: 0, y: 0, width: 10, height: 10, editable: true }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /needs src\/imageUrl/);
  base.canvas.elements = [{ id: 'text', type: 'text', x: 0, y: 0, width: 10, height: 10, editable: true }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /needs text\/content/);
  base.canvas.elements = [{ id: 'shape', type: 'shape', x: 0, y: 0, width: 10, height: 10 }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /needs editable/);
  base.canvas.elements = [{ id: 'shape', type: 'shape', x: -1, y: 0, width: 10, height: 10, editable: true }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /non-negative x/);
  base.canvas.elements = [{ id: 'bound', type: 'text', x: 0, y: 0, width: 10, height: 10, editable: true, field: 'headline' }];
  assert.throws(() => assertPublishableTemplateJson(base, 0), /no matching editable\/dynamic field/);
});

test('asset insertion uses the real image element schema and remains editable', () => {
  const url = 'https://example.test/template-assets/1';
  const output = insertAssetIntoTemplateJson('', url, v2);
  const parsed = JSON.parse(output) as { canvas: { elements: Array<Record<string, unknown>> } };
  const inserted = parsed.canvas.elements.at(-1);
  assert.equal(inserted?.type, 'image');
  assert.equal(inserted?.src, url);
  assert.equal(inserted?.imageUrl, url);
  assert.equal(inserted?.editable, true);
  assert.deepEqual(Object.keys(inserted?.position as object), ['x', 'y']);
  assert.deepEqual(Object.keys(inserted?.size as object), ['width', 'height']);
});

test('replacing an asset updates every matching JSON URL without changing bindings', () => {
  const oldUrl = 'https://example.test/old';
  const nextUrl = 'https://example.test/new';
  const input = insertAssetIntoTemplateJson('', oldUrl, v2);
  const output = replaceTemplateAssetUrl(input, oldUrl, nextUrl);
  assert.ok(output.includes(nextUrl));
  assert.ok(!output.includes(oldUrl));
  assert.ok(output.includes('"editable": true'));
  assert.ok(output.includes('"field": "imageUrls"'));
});
