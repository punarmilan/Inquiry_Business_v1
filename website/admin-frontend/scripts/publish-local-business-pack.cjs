// Credentials arrive on stdin; never store credentials or session tokens on disk.
const fs = require('node:fs');
const readline = require('node:readline');
const assert = require('node:assert/strict');
const path = require('node:path');
const { validatePack, artifactRoot } = require('./local-business-pack-tools.cjs');
const baseUrl = process.env.ADMIN_API_BASE_URL || process.argv[2] || 'http://localhost:5001';
const receiptPath = path.join(artifactRoot, 'publication.json');
let accessToken;
let refreshToken;
const receipt = { baseUrl, startedAt: new Date().toISOString(), records: [], verified: false };
function saveReceipt() {
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}
async function api(route, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    // Never print the response payload: authentication responses can contain secrets.
    throw new Error(`${method} ${route} failed (HTTP ${response.status}, ${data.code || data.error?.code || 'REQUEST_FAILED'}).`);
  }
  return data;
}
function checkSubset(actual, expected, label) {
  if (expected && typeof expected === 'object') {
    assert.ok(actual && typeof actual === 'object', `${label} missing`);
    if (Array.isArray(expected)) assert.equal(actual.length, expected.length, `${label} length`);
    for (const key of Object.keys(expected)) checkSubset(actual[key], expected[key], `${label}.${key}`);
  } else assert.equal(actual, expected, `${label} differs`);
}
function verifyRecord(actual, expected) {
  assert.ok(actual?._id, `${expected.slug}: missing record ID`);
  for (const key of ['name', 'slug', 'category', 'isActive', 'canvas', 'dynamicFields', 'primaryColor', 'secondaryColor', 'allowColorChange', 'editableFields']) {
    checkSubset(actual[key], expected[key], `${expected.slug}.${key}`);
  }
  assert.ok(!actual.previewUrl, `${expected.slug}: preview overrides canvas`);
  assert.ok(actual.createdBy, `${expected.slug}: admin creator missing`);
}
async function main() {
  const { normalized, counts } = validatePack();
  receipt.counts = counts;
  console.log('Validated 36 templates. Ready for admin credentials on stdin.');
  const input = readline.createInterface({ input: process.stdin, terminal: false });
  let credentials;
  for await (const line of input) {
    try { credentials = JSON.parse(line); } catch { throw new Error('Credentials must be a JSON object on stdin.'); }
    break;
  }
  input.close();
  assert.ok(credentials?.email && credentials?.password, 'Admin login details required.');
  const login = await api('/auth/login', 'POST', credentials);
  credentials.password = ''; credentials.email = ''; credentials = undefined;
  accessToken = login.accessToken; refreshToken = login.refreshToken;
  assert.ok(accessToken && refreshToken, 'Login returned no usable admin session.');
  console.log('Admin login successful. Checking existing template slugs.');
  const existing = (await api('/hyperlocal/offer-templates')).data;
  assert.ok(Array.isArray(existing), 'Unexpected template list response.');
  // Check every collision before the first write; never overwrite existing templates.
  for (const expected of normalized) {
    const found = existing.find((item) => item.slug === expected.slug);
    if (found) verifyRecord(found, expected);
  }
  saveReceipt();
  for (const expected of normalized) {
    const found = existing.find((item) => item.slug === expected.slug);
    const actual = found || (await api('/hyperlocal/offer-templates', 'POST', expected)).template;
    receipt.records.push({ id: actual?._id, slug: expected.slug, name: expected.name, category: expected.category, action: found ? 'already-present' : 'created' });
    saveReceipt();
    verifyRecord(actual, expected);
    console.log(`${receipt.records.length}/36 ${found ? 'Verified' : 'Published'}: ${expected.category} / ${expected.name}`);
  }
  const saved = (await api('/hyperlocal/offer-templates')).data;
  for (const expected of normalized) {
    const matches = saved.filter((item) => item.slug === expected.slug);
    assert.equal(matches.length, 1, `${expected.slug}: expected exactly one saved record`);
    verifyRecord(matches[0], expected);
  }
  receipt.verified = true; receipt.finishedAt = new Date().toISOString(); saveReceipt();
  console.log('PASS: all 36 active templates read back from admin API; 6 categories, 6 each.');
}
main().catch((error) => {
  console.error(error.message);
  console.error(`Publication incomplete. ${receipt.records.length} records recorded; inspect publication.json before retrying.`);
  process.exitCode = 1;
}).finally(async () => {
  if (refreshToken) {
    try { await api('/auth/logout', 'POST', { refreshToken }); console.log('Admin publishing session logged out.'); }
    catch { console.error('Could not revoke the publishing session refresh token.'); }
  }
  accessToken = undefined; refreshToken = undefined;
});
