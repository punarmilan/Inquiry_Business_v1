const ExcelJS = require('exceljs');
const City = require('../models/City');
const ServiceCategory = require('../models/ServiceCategory');
const Worker = require('../models/Worker');
const ApiError = require('../utils/ApiError');
const loadExcelWorkbook = require('../utils/loadExcelWorkbook');
const { workerCreate } = require('../validators/hyperlocal.validator');

const HEADERS = ['Provider Name', 'Phone', 'WhatsApp', 'City / Location', 'Service Categories', 'Service Areas'];
const REQUIRED_HEADERS = ['Provider Name', 'Phone', 'City / Location', 'Service Categories'];
const MAX_IMPORT_ROWS = 10000;
const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
const normalise = (value) => String(value).normalize('NFKC').toLocaleLowerCase('en-IN').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]/gu, '');
const splitValues = (value) => [...new Set(value.split(/[,;|\n]+/).map((part) => part.trim()).filter(Boolean))];
const normalisePhone = (value) => {
  if (value.trim().startsWith('-')) return value.trim();
  const phone = value.trim().replace(/^'/, '').replace(/[\s()\-]/g, '');
  if (/^\d{10}$/.test(phone)) return `+91${phone}`;
  if (/^91\d{10}$/.test(phone)) return `+${phone}`;
  if (/^0091\d{10}$/.test(phone)) return `+${phone.slice(2)}`;
  if (/^[1-9]\d{7,14}$/.test(phone)) return `+${phone}`;
  return phone;
};
const phoneAliases = (phone) => [...new Set([phone, phone.replace(/^\+/, ''), ...( /^\+91\d{10}$/.test(phone) ? [phone.slice(3)] : [])])];

const cellText = (cell, header) => {
  if (cell.value === null || cell.value === undefined) return '';
  if (cell.value instanceof Date || cell.value?.error) throw new Error(`${header} must contain text, not a date or Excel error.`);
  if (cell.type === ExcelJS.ValueType.Formula && cell.result === undefined) throw new Error(`${header} has a formula without a saved result. Paste its value instead.`);
  if (cell.type === ExcelJS.ValueType.Formula && (cell.result instanceof Date || cell.result?.error)) throw new Error(`${header} has an invalid formula result.`);
  return cell.text.trim();
};

const readProviderWorkbook = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new ApiError(422, 'Choose an Excel .xlsx file to import.', 'IMPORT_FILE_REQUIRED');
  if (buffer.length > MAX_IMPORT_BYTES) throw new ApiError(413, 'Excel files must be 25 MB or smaller.', 'IMPORT_FILE_TOO_LARGE');
  let workbook;
  try { workbook = await loadExcelWorkbook(buffer); }
  catch { throw new ApiError(422, 'This file could not be read. Upload a valid, unencrypted Excel .xlsx workbook.', 'IMPORT_FILE_INVALID'); }
  const sheet = workbook.worksheets.find((item) => normalise(item.name) === 'importproviders') || workbook.worksheets[0];
  if (!sheet) throw new ApiError(422, 'The workbook has no worksheets.', 'IMPORT_SHEET_EMPTY');
  let headerRow;
  sheet.eachRow((row) => { if (!headerRow && row.hasValues) headerRow = row; });
  if (!headerRow) throw new ApiError(422, 'The worksheet is empty. Use the import template.', 'IMPORT_SHEET_EMPTY');
  const columns = new Map();
  headerRow.eachCell((cell, column) => {
    const header = HEADERS.find((name) => normalise(name) === normalise(cell.text));
    if (!header) return;
    if (columns.has(header)) throw new ApiError(422, `The ${header} column appears more than once.`, 'IMPORT_HEADERS_INVALID');
    columns.set(header, column);
  });
  const missing = REQUIRED_HEADERS.filter((header) => !columns.has(header));
  if (missing.length) throw new ApiError(422, `Missing columns: ${missing.join(', ')}. Download the import template for the correct format.`, 'IMPORT_HEADERS_INVALID');
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow.number || ![...columns.values()].some((column) => row.getCell(column).text.trim())) return;
    if (rows.length >= MAX_IMPORT_ROWS) throw new ApiError(422, `Import up to ${MAX_IMPORT_ROWS} providers at a time. Split this workbook into smaller files.`, 'IMPORT_TOO_MANY_ROWS');
    const entry = { rowNumber, values: {} };
    try {
      HEADERS.forEach((header) => { entry.values[header] = columns.has(header) ? cellText(row.getCell(columns.get(header)), header) : ''; });
    } catch (error) { entry.error = error.message; }
    rows.push(entry);
  });
  if (!rows.length) throw new ApiError(422, 'No provider rows found below the headers.', 'IMPORT_ROWS_EMPTY');
  return rows;
};

const nameIndex = (records, aliases) => {
  const index = new Map();
  records.forEach((record) => {
    new Set(aliases(record).filter(Boolean).map(normalise)).forEach((key) => {
      index.set(key, [...(index.get(key) || []), record]);
    });
  });
  return index;
};
const matchName = (index, name, label) => {
  const matches = index.get(normalise(name)) || [];
  if (!matches.length) throw new Error(`${label} "${name}" was not found or is inactive. Add or enable it before importing.`);
  if (matches.length !== 1) throw new Error(`${label} "${name}" matches more than one record. Use a unique ${label.toLowerCase()} name${label === 'City' ? ' or City, State' : ' or category slug'}.`);
  return matches[0];
};

const createProviderImporter = ({ CityModel = City, CategoryModel = ServiceCategory, WorkerModel = Worker } = {}) => async (buffer) => {
  // Validate the workbook shape/row limit before any database writes.
  const inputRows = await readProviderWorkbook(buffer);
  const [cities, categories] = await Promise.all([
    CityModel.find({ isActive: true, servicesEnabled: true }).select('_id name state slug').lean(),
    CategoryModel.find({ isActive: true }).select('_id name slug cityAvailability').lean(),
  ]);
  const cityIndex = nameIndex(cities, (city) => [city.name, city.slug, city.state ? `${city.name}, ${city.state}` : '']);
  const categoryIndex = nameIndex(categories, (category) => [category.name, category.slug]);
  const rows = [];
  const prepared = [];
  const seenPhones = new Set();
  inputRows.forEach((entry) => {
    const values = entry.values;
    const result = { rowNumber: entry.rowNumber, name: values['Provider Name'] || '', phone: values.Phone || '', status: 'error', message: '' };
    rows.push(result);
    try {
      if (entry.error) throw new Error(entry.error);
      for (const header of REQUIRED_HEADERS) if (!values[header]) throw new Error(`${header} is required.`);
      const city = matchName(cityIndex, values['City / Location'], 'City');
      const categoryNames = categoryIndex.has(normalise(values['Service Categories'])) ? [values['Service Categories']] : splitValues(values['Service Categories']);
      const matchedCategories = categoryNames.map((name) => matchName(categoryIndex, name, 'Category'));
      for (const category of matchedCategories) {
        if (category.cityAvailability?.length && !category.cityAvailability.some((id) => String(id) === String(city._id))) throw new Error(`Category "${category.name}" is not available in ${city.name}.`);
      }
      const payload = {
        name: values['Provider Name'], phone: normalisePhone(values.Phone), whatsapp: values.WhatsApp ? normalisePhone(values.WhatsApp) : '',
        cityId: String(city._id), categoryIds: [...new Set(matchedCategories.map((category) => String(category._id)))],
        serviceAreas: splitValues(values['Service Areas']),
      };
      const { error } = workerCreate.extract('body').validate(payload, { abortEarly: false });
      if (error) {
        const messages = {
          name: 'Provider Name must be between 2 and 120 characters.',
          phone: 'Phone must be a valid phone number, such as a 10-digit Indian number or a number with its country code.',
          whatsapp: 'WhatsApp must be a valid phone number, or leave it blank.',
          categoryIds: 'Choose between 1 and 20 service categories.',
          serviceAreas: 'Use up to 100 service areas, with no more than 120 characters per area.',
        };
        throw new Error([...new Set(error.details.map((detail) => messages[detail.path[0]] || 'One or more values in this row are invalid.'))].join(' '));
      }
      result.name = payload.name;
      result.phone = payload.phone;
      if (seenPhones.has(payload.phone)) {
        Object.assign(result, { status: 'skipped', message: 'Duplicate phone number in this workbook.' });
        return;
      }
      seenPhones.add(payload.phone);
      prepared.push({ result, document: {
        name: payload.name, phone: payload.phone, whatsapp: payload.whatsapp, city: city._id,
        categories: matchedCategories.filter((category, index, all) => all.findIndex((item) => String(item._id) === String(category._id)) === index).map((category) => category._id),
        serviceAreas: payload.serviceAreas, availability: 'available', isActive: true, verificationStatus: 'verified',
      } });
    } catch (error) { result.message = error.message; }
  });

  if (prepared.length) {
    const aliases = [...new Set(prepared.flatMap(({ document }) => phoneAliases(document.phone)))];
    const existing = await WorkerModel.find({ phone: { $in: aliases } }).select('phone').lean();
    const existingPhones = new Set(existing.map((worker) => normalisePhone(worker.phone)));
    const inserts = prepared.filter(({ result, document }) => {
      if (!existingPhones.has(document.phone)) return true;
      Object.assign(result, { status: 'skipped', message: 'A provider with this phone number already exists; no changes made.' });
      return false;
    });
    if (inserts.length) {
      const now = new Date();
      const operations = inserts.map(({ document }) => ({ updateOne: {
        filter: { phone: document.phone }, update: { $setOnInsert: { ...document, createdAt: now, updatedAt: now } }, upsert: true, timestamps: false,
      } }));
      let outcome;
      let writeErrors = [];
      try { outcome = await WorkerModel.bulkWrite(operations, { ordered: false, timestamps: false }); }
      catch (error) {
        if (!error.result || !error.writeErrors?.length || error.writeConcernErrors?.length) throw new ApiError(503, 'Import was interrupted. Some providers may have been added. Upload the file again; existing phone numbers will be skipped.', 'IMPORT_INTERRUPTED');
        outcome = error.result;
        writeErrors = error.writeErrors;
      }
      const upserted = outcome.upsertedIds || {};
      inserts.forEach(({ result }, index) => {
        const writeError = writeErrors.find((error) => error.index === index);
        if (writeError) {
          Object.assign(result, { status: writeError.code === 11000 ? 'skipped' : 'error', message: writeError.code === 11000 ? 'A provider with this phone number already exists; no changes made.' : 'Could not add this provider. Check this row and try again.' });
        } else if (Object.hasOwn(upserted, index)) Object.assign(result, { status: 'created', message: 'Provider added.' });
        else Object.assign(result, { status: 'skipped', message: 'A provider with this phone number already exists; no changes made.' });
      });
    }
  }
  return { total: rows.length, created: rows.filter((row) => row.status === 'created').length, skipped: rows.filter((row) => row.status === 'skipped').length, failed: rows.filter((row) => row.status === 'error').length, rows };
};

const createProviderTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Providers', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = HEADERS.map((header, index) => ({ header, key: header, width: [38, 21, 21, 28, 38, 34][index] }));
  sheet.getColumn(2).numFmt = '@';
  sheet.getColumn(3).numFmt = '@';
  sheet.getRow(1).height = 28;
  sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
  sheet.autoFilter = 'A1:F1';
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

module.exports = { HEADERS, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, readProviderWorkbook, createProviderImporter, importProviders: createProviderImporter(), createProviderTemplate };
