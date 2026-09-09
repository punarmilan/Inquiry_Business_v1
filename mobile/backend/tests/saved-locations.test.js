const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '../../frontend/src');
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');

test('TC_02: profile opens the dedicated Saved Locations route', () => {
  const profile = read('screens/profile/ProfileScreen.tsx');
  const navigator = read('navigation/ProfileNavigator.tsx');
  const types = read('navigation/types.ts');

  assert.match(profile, /navigation\.navigate\('SavedLocations'\)/);
  assert.doesNotMatch(profile, /title="Saved locations"[^\n]+navigate\('EditProfile'/);
  assert.match(navigator, /name="SavedLocations" component=\{SavedLocationsScreen\}/);
  assert.match(types, /SavedLocations: undefined/);
});

test('TC_02: Saved Locations manages the canonical hyperlocal location', () => {
  const screen = read('screens/profile/SavedLocationsScreen.tsx');
  const hook = read('hooks/useHyperlocalLocation.ts');

  assert.match(screen, /useHyperlocalLocation\(\{ promptOnEmpty: false \}\)/);
  assert.match(screen, /No saved location/);
  assert.match(screen, /locationState\.chooseManual/);
  assert.match(screen, /locationState\.detect/);
  assert.match(screen, /locationState\.clearLocation\(\)/);
  assert.match(screen, /navigation\.goBack\(\)/);
  assert.match(hook, /AsyncStorage\.removeItem\(STORAGE_KEY\)/);
  assert.equal((hook.match(/const STORAGE_KEY = 'inquiryexperts_hyperlocal_location'/g) || []).length, 1);
  assert.doesNotMatch(screen, /AsyncStorage/);
});
