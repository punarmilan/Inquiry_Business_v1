const test = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { HEADERS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, createProviderImporter, readProviderWorkbook, createProviderTemplate } = require('../src/services/providerImportService');

const CITY = '507f1f77bcf86cd799439011';
const CARPENTER = '507f1f77bcf86cd799439012';
const FURNITURE = '507f1f77bcf86cd799439013';
const OTHER_CITY = '507f1f77bcf86cd799439014';
const baseCities = [{ _id: CITY, name: 'Pimpri-Chinchwad', state: 'Maharashtra', slug: 'pimpri-chinchwad', isActive: true, servicesEnabled: true }];
const baseCategories = [
  { _id: CARPENTER, name: 'Carpenter', slug: 'carpenter', isActive: true, cityAvailability: [] },
  { _id: FURNITURE, name: 'Furniture & Interior Work', slug: 'furniture-interior-work', isActive: true, cityAvailability: [CITY] },
];
const providerRow = (name = 'Example Carpenter', phone = '+919876500001', category = 'Carpenter', city = 'Pimpri-Chinchwad', whatsapp = '', areas = 'Wakad') => [name, phone, whatsapp, city, category, areas];
const workbookBuffer = async (rows, headers = HEADERS, { instructionsFirst = false } = {}) => {
  const workbook = new ExcelJS.Workbook();
  if (instructionsFirst) workbook.addWorksheet('Instructions').addRow(['Use the Import Providers tab']);
  const sheet = workbook.addWorksheet('Import Providers');
  sheet.addRow(headers);
  sheet.addRows(rows);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const fakeModels = ({ cities = baseCities, categories = baseCategories, existing = [] } = {}) => {
  const calls = { lookups: [], operations: [], bulkOptions: [] };
  const records = [...existing];
  const lookup = (data) => ({ find(filter) {
    calls.lookups.push(filter);
    return { select: () => ({ lean: async () => data.filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value)) }) };
  } });
  const WorkerModel = {
    find(filter) { return { select: () => ({ lean: async () => records.filter((row) => filter.phone.$in.includes(row.phone)) }) }; },
    async bulkWrite(operations, options) {
      calls.operations.push(...operations);
      calls.bulkOptions.push(options);
      const upsertedIds = {};
      operations.forEach((operation, index) => {
        const { filter, update } = operation.updateOne;
        if (!records.some((record) => record.phone === filter.phone)) {
          records.push({ ...update.$setOnInsert });
          upsertedIds[index] = 'new-id-' + index;
        }
      });
      return { upsertedIds };
    },
  };
  return { calls, records, models: { CityModel: lookup(cities), CategoryModel: lookup(categories), WorkerModel } };
};

test('imports the supplied six-column format, numeric phones, optional WhatsApp and multiple categories/areas', async () => {
  const state = fakeModels();
  const importer = createProviderImporter(state.models);
  const buffer = await workbookBuffer([
    providerRow('Carpenter One', 919876500001, 'carpenter', 'Pimpri Chinchwad', '', 'Wakad, Baner'),
    providerRow('Interior Two', '9876500002', 'Carpenter; Furniture & Interior Work', ' PIMPRI-CHINCHWAD ', '91 98765 00002', 'Ravet | Thergaon'),
  ]);
  const result = await importer(buffer);
  assert.deepEqual([result.total, result.created, result.skipped, result.failed], [2, 2, 0, 0]);
  assert.deepEqual(result.rows.map((row) => row.rowNumber), [2, 3]);
  assert.equal(state.records[0].phone, '+919876500001');
  assert.equal(state.records[0].whatsapp, '');
  assert.deepEqual(state.records[0].serviceAreas, ['Wakad', 'Baner']);
  assert.deepEqual(state.records[1].categories, [CARPENTER, FURNITURE]);
  assert.equal(state.records[1].whatsapp, '+919876500002');
  assert.equal(state.records[1].isActive, true);
  assert.equal(state.records[1].verificationStatus, 'verified');
  assert.equal(state.records[1].availability, 'available');
  assert.ok(!Object.hasOwn(state.records[1], 'user'), 'import creates directory entries without login accounts');
  assert.deepEqual(state.calls.lookups, [{ isActive: true, servicesEnabled: true }, { isActive: true }]);
});

test('duplicates in the workbook and existing local/country-code numbers are skipped without updating existing providers', async () => {
  const original = { phone: '9876500001', name: 'Existing provider', isActive: false, updatedAt: new Date('2025-01-01') };
  const state = fakeModels({ existing: [original] });
  const importer = createProviderImporter(state.models);
  const buffer = await workbookBuffer([providerRow('Do not overwrite'), providerRow('New provider', '9876500002'), providerRow('Repeated new provider', '+91 98765 00002')]);
  const result = await importer(buffer);
  assert.deepEqual([result.created, result.skipped, result.failed], [1, 2, 0]);
  assert.deepEqual(state.records[0], original);
  assert.equal(state.calls.operations[0].updateOne.timestamps, false);
  assert.equal(state.calls.bulkOptions[0].timestamps, false);
  assert.deepEqual(Object.keys(state.calls.operations[0].updateOne.update), ['$setOnInsert']);
  const again = await importer(buffer);
  assert.deepEqual([again.created, again.skipped, again.failed], [0, 3, 0]);
  assert.equal(state.records.length, 2);
});

test('valid rows are added while invalid names, phones, WhatsApp, cities and categories report exact Excel row numbers', async () => {
  const state = fakeModels();
  const result = await createProviderImporter(state.models)(await workbookBuffer([
    providerRow('Good provider'), providerRow('Bad phone', 'invalid'), providerRow('Unknown city', '9876500003', 'Carpenter', 'Missing city'),
    providerRow('Unknown category', '9876500004', 'Missing category'), providerRow('Bad WhatsApp', '9876500005', 'Carpenter', 'Pimpri-Chinchwad', 'invalid'),
    providerRow('X', '9876500006'), providerRow('Missing phone', ''),
  ]));
  assert.deepEqual([result.created, result.failed], [1, 6]);
  assert.deepEqual(result.rows.filter((row) => row.status === 'error').map((row) => row.rowNumber), [3, 4, 5, 6, 7, 8]);
  assert.match(result.rows[1].message, /Phone must be a valid/);
  assert.match(result.rows[2].message, /City.*Missing city/);
  assert.match(result.rows[3].message, /Category.*Missing category/);
  assert.match(result.rows[4].message, /WhatsApp/);
  assert.match(result.rows[5].message, /Provider Name/);
  assert.match(result.rows[6].message, /Phone is required/);
});

test('unavailable city services, inactive categories and city-restricted categories cannot be imported', async () => {
  const state = fakeModels({
    cities: [...baseCities, { _id: OTHER_CITY, name: 'Disabled City', isActive: true, servicesEnabled: false }],
    categories: [...baseCategories, { _id: '507f1f77bcf86cd799439015', name: 'Inactive service', isActive: false }, { _id: '507f1f77bcf86cd799439016', name: 'Other city service', isActive: true, cityAvailability: [OTHER_CITY] }],
  });
  const result = await createProviderImporter(state.models)(await workbookBuffer([providerRow('Disabled city', '9876500001', 'Carpenter', 'Disabled City'), providerRow('Inactive category', '9876500002', 'Inactive service'), providerRow('Wrong city category', '9876500003', 'Other city service')]));
  assert.equal(result.failed, 3);
  assert.equal(state.calls.operations.length, 0);
  assert.match(result.rows[2].message, /not available in/);
});

test('duplicate city names require City, State rather than guessing', async () => {
  const state = fakeModels({ cities: [...baseCities, { ...baseCities[0], _id: OTHER_CITY, state: 'Other State', slug: 'other-pimpri' }] });
  const result = await createProviderImporter(state.models)(await workbookBuffer([providerRow('Ambiguous'), providerRow('Specific', '9876500002', 'Carpenter', 'Pimpri-Chinchwad, Maharashtra')]));
  assert.equal(result.failed, 1);
  assert.match(result.rows[0].message, /more than one/);
  assert.equal(result.created, 1);
  assert.equal(state.records[0].city, CITY);
});

test('named Import Providers sheet is used; columns may be reordered and optional columns omitted', async () => {
  const state = fakeModels();
  const buffer = await workbookBuffer([['Carpenter', '9876500001', 'Provider Name Here', 'Pimpri-Chinchwad']], ['Service Categories', 'Phone', 'Provider Name', 'City / Location'], { instructionsFirst: true });
  const result = await createProviderImporter(state.models)(buffer);
  assert.equal(result.created, 1);
  assert.equal(state.records[0].whatsapp, '');
  assert.deepEqual(state.records[0].serviceAreas, []);
});

test('blank rows are ignored and a malformed duplicate does not prevent a later valid row being added', async () => {
  const state = fakeModels();
  const result = await createProviderImporter(state.models)(await workbookBuffer([providerRow('X'), ['', '', '', '', '', ''], providerRow('Valid') ]));
  assert.deepEqual([result.total, result.created, result.failed], [2, 1, 1]);
  assert.deepEqual(result.rows.map((row) => row.rowNumber), [2, 4]);
});

test('a workbook with exactly 10,000 provider rows is accepted', async () => {
  const rows = await readProviderWorkbook(await workbookBuffer(Array.from({ length: 10000 }, (_, index) => providerRow(`Provider ${index + 1}`, String(9876500000 + index)))));
  assert.equal(rows.length, 10000);
  assert.equal(rows.at(-1).rowNumber, 10001);
  assert.equal(rows.at(-1).values['Provider Name'], 'Provider 10000');
});

test('25 MB files reach workbook validation and larger files are rejected', async () => {
  await assert.rejects(readProviderWorkbook(Buffer.alloc(25 * 1024 * 1024)), (error) => error.code === 'IMPORT_FILE_INVALID');
  await assert.rejects(readProviderWorkbook(Buffer.alloc(25 * 1024 * 1024 + 1)), (error) => error.statusCode === 413 && error.code === 'IMPORT_FILE_TOO_LARGE' && /25 MB/.test(error.message));
});

test('multipart upload accepts exactly 25 MB and rejects one byte above the limit', async (t) => {
  const express = require('express');
  const upload = require('../src/middleware/providerImportUpload');
  const app = express();
  app.post('/import', upload, (req, res) => res.json({ size: req.file.size }));
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ code: error.code, message: error.message }));
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const uploadFile = async (size) => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(size)]), 'providers.xlsx');
    return fetch(`http://127.0.0.1:${server.address().port}/import`, { method: 'POST', body: form });
  };
  const accepted = await uploadFile(25 * 1024 * 1024);
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { size: 25 * 1024 * 1024 });
  const rejected = await uploadFile(25 * 1024 * 1024 + 1);
  assert.equal(rejected.status, 413);
  const error = await rejected.json();
  assert.equal(error.code, 'IMPORT_FILE_TOO_LARGE');
  assert.match(error.message, /25 MB/);
});

test('missing/duplicate headers, corrupt files, oversized files, empty templates and row-limit violations are rejected before writes', async () => {
  const state = fakeModels();
  const importer = createProviderImporter(state.models);
  const invalid = [
    [Buffer.from('not an xlsx'), 'IMPORT_FILE_INVALID'],
    [Buffer.alloc(0), 'IMPORT_FILE_REQUIRED'],
    [Buffer.alloc(MAX_IMPORT_BYTES + 1), 'IMPORT_FILE_TOO_LARGE'],
    [await workbookBuffer([['Name']], ['Provider Name']), 'IMPORT_HEADERS_INVALID'],
    [await workbookBuffer([providerRow()], [...HEADERS, 'Phone']), 'IMPORT_HEADERS_INVALID'],
    [await createProviderTemplate(), 'IMPORT_ROWS_EMPTY'],
    [await workbookBuffer(Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => providerRow())), 'IMPORT_TOO_MANY_ROWS'],
  ];
  for (const [buffer, code] of invalid) await assert.rejects(importer(buffer), (error) => error.code === code, code);
  assert.equal(state.calls.operations.length, 0);
  assert.equal(state.calls.lookups.length, 0);
});

test('uncomputed formulas and Excel error/date cells are row errors; saved formula values do not execute formulas', async () => {
  const state = fakeModels();
  const result = await createProviderImporter(state.models)(await workbookBuffer([
    providerRow('No saved value', { formula: 'SUM(1, 2)' }), providerRow('Error cell', { error: '#VALUE!' }),
    providerRow('Date cell', new Date()), providerRow('Cached value', { formula: '1+1', result: 9876500004 }),
  ]));
  assert.deepEqual([result.created, result.failed], [1, 3]);
  assert.equal(state.records[0].phone, '+919876500004');
});

test('concurrent duplicate upserts and individual write failures preserve accurate partial results', async () => {
  const state = fakeModels();
  state.models.WorkerModel.bulkWrite = async () => {
    const error = new Error('Bulk failure');
    error.result = { upsertedIds: { 0: 'new-id' } };
    error.writeErrors = [{ index: 1, code: 11000 }, { index: 2, code: 121 }];
    throw error;
  };
  const result = await createProviderImporter(state.models)(await workbookBuffer([providerRow('Created'), providerRow('Racing duplicate', '9876500002'), providerRow('Write failure', '9876500003')]));
  assert.deepEqual([result.created, result.skipped, result.failed], [1, 1, 1]);
  assert.equal(result.rows[2].status, 'error');
});

test('interrupted writes explain safe retry rather than claiming nothing was imported', async () => {
  const state = fakeModels();
  state.models.WorkerModel.bulkWrite = async () => { throw new Error('Connection lost'); };
  await assert.rejects(createProviderImporter(state.models)(await workbookBuffer([providerRow()])), (error) => error.statusCode === 503 && error.code === 'IMPORT_INTERRUPTED' && /Some providers may have been added/.test(error.message));
});

test('downloadable template preserves the exact six headers, text phone columns, and contains no demo providers', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await createProviderTemplate());
  const sheet = workbook.getWorksheet('Import Providers');
  assert.deepEqual(sheet.getRow(1).values.slice(1), HEADERS);
  assert.equal(sheet.getColumn(2).numFmt, '@');
  assert.equal(sheet.getColumn(3).numFmt, '@');
  assert.equal(sheet.actualRowCount, 1);
});

test('template and upload routes remain behind admin authentication', () => {
  const { requireAdminAuth } = require('../src/middleware/auth');
  const router = require('../src/routes/hyperlocalRoutes');
  const authIndex = router.stack.findIndex((layer) => layer.handle === requireAdminAuth);
  for (const [path, method] of [['/workers/import', 'post'], ['/workers/import-template', 'get']]) {
    assert.ok(router.stack.findIndex((layer) => layer.route?.path === path && layer.route.methods[method]) > authIndex);
  }
});
