const ExcelJS = require('exceljs');
const JSZip = require('jszip');
const { SaxesParser } = require('saxes');

const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const SPREADSHEET_PART = /^xl\/(?:workbook|styles|sharedStrings|comments\d+|worksheets\/[^/]+|tables\/[^/]+)\.xml$/;
const escapeText = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
const escapeAttribute = (value) => escapeText(value).replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\t/g, '&#9;');

// ExcelJS expects unprefixed SpreadsheetML elements, although prefixed names
// are equally valid XLSX. Resolve namespaces so cell text and r:id attributes
// are preserved, including text which happens to look like an XML tag.
const normaliseSpreadsheetXml = (xml) => {
  const parser = new SaxesParser({ xmlns: true });
  const output = [];
  const defaultNamespaces = [];
  let changed = false;
  parser.on('opentag', (node) => {
    let attributes = Object.values(node.attributes);
    let defaultNamespace = attributes.find((attribute) => attribute.name === 'xmlns')?.value ?? defaultNamespaces.at(-1) ?? '';
    const spreadsheetElement = node.uri === SPREADSHEET_NS;
    if (spreadsheetElement) {
      if (node.prefix) changed = true;
      if (defaultNamespace !== SPREADSHEET_NS) {
        attributes = attributes.filter((attribute) => attribute.name !== 'xmlns');
        attributes.push({ name: 'xmlns', value: SPREADSHEET_NS });
        defaultNamespace = SPREADSHEET_NS;
      }
    }
    defaultNamespaces.push(defaultNamespace);
    const name = spreadsheetElement ? node.local : node.name;
    output.push(`<${name}${attributes.map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join('')}${node.isSelfClosing ? '/>' : '>'}`);
  });
  parser.on('closetag', (node) => {
    if (!node.isSelfClosing) output.push(`</${node.uri === SPREADSHEET_NS ? node.local : node.name}>`);
    defaultNamespaces.pop();
  });
  parser.on('text', (value) => output.push(escapeText(value)));
  parser.on('cdata', (value) => output.push(escapeText(value)));
  parser.write(xml).close();
  return changed ? output.join('') : null;
};

const loadExcelWorkbook = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  let changed = false;
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !SPREADSHEET_PART.test(entry.name)) continue;
    const xml = await entry.async('string');
    if (!/<[A-Za-z_][\w.-]*:/.test(xml)) continue;
    const normalised = normaliseSpreadsheetXml(xml);
    if (normalised === null) continue;
    zip.file(entry.name, normalised);
    changed = true;
  }
  const compatibleBuffer = changed ? await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) : buffer;
  // Imports use cell values. Skip table links, whose valid absolute targets
  // ExcelJS cannot reconcile; the original table and workbook stay untouched.
  return new ExcelJS.Workbook().xlsx.load(compatibleBuffer, { ignoreNodes: ['tableParts'] });
};

module.exports = loadExcelWorkbook;
