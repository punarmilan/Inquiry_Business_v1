const test = require('node:test');
const assert = require('node:assert/strict');
const { createCityGeocoder } = require('../src/services/cityGeocodingService');

const place = (state = 'Maharashtra') => ({
  displayName: { text: 'Pimpri-Chinchwad' }, types: ['locality', 'political'],
  location: { latitude: 18.6263131, longitude: 73.805498 },
  addressComponents: [
    { longText: 'India', shortText: 'IN', types: ['country'] },
    { longText: state, shortText: 'MH', types: ['administrative_area_level_1'] },
    { longText: 'Pimpri-Chinchwad', types: ['locality'] },
  ],
});
const geocoder = (places) => createCityGeocoder({ apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ places }) }) });

test('Maps city lookup returns verified GeoJSON coordinates and state, using a server key and timeout', async () => {
  const lookup = createCityGeocoder({ apiKey: 'test-key', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://places.googleapis.com/v1/places:searchText');
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-key');
    assert.equal(JSON.parse(options.body).textQuery, 'Pimpri Chinchwad, India');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ places: [place()] }) };
  } });
  assert.deepEqual(await lookup('Pimpri Chinchwad'), { name: 'Pimpri-Chinchwad', state: 'Maharashtra', center: { type: 'Point', coordinates: [73.805498, 18.6263131] } });
});

test('city name collisions require a state and City, State resolves the intended match', async () => {
  const lookup = geocoder([place(), place('Other State')]);
  await assert.rejects(lookup('Pimpri-Chinchwad'), /ambiguous/);
  assert.equal((await lookup('Pimpri-Chinchwad, Maharashtra')).state, 'Maharashtra');
});

test('unrelated places, businesses, foreign places and invalid coordinates never become cities', async () => {
  await assert.rejects(geocoder([{ ...place(), displayName: { text: 'Other City' }, addressComponents: [] }])('Pimpri-Chinchwad'), /Could not locate/);
  await assert.rejects(geocoder([{ ...place(), types: ['plumber'] }])('Pimpri-Chinchwad'), /Could not locate/);
  await assert.rejects(geocoder([{ ...place(), addressComponents: place().addressComponents.map((part) => part.types.includes('country') ? { ...part, shortText: 'US' } : part) }])('Pimpri-Chinchwad'), /Could not locate/);
  await assert.rejects(geocoder([{ ...place(), location: { latitude: 999, longitude: 0 } }])('Pimpri-Chinchwad'), /Coordinates/);
});

test('missing configuration and upstream failures explain retry without fabricating a location', async () => {
  await assert.rejects(createCityGeocoder({ apiKey: '', fetchImpl: () => { throw new Error('must not call'); } })('Pune'), /unavailable/);
  await assert.rejects(createCityGeocoder({ apiKey: 'test-key', fetchImpl: async () => { throw new Error('network'); } })('Pune'), /temporarily unavailable/);
  await assert.rejects(createCityGeocoder({ apiKey: 'test-key', fetchImpl: async () => ({ ok: false }) })('Pune'), /lookup failed/);
});
