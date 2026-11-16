const env = require('../config/env');

const normalise = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase('en-IN').replace(/[^\p{L}\p{N}]/gu, '');

const createCityGeocoder = ({ apiKey = env.googleMapsServerApiKey, fetchImpl = (...args) => fetch(...args) } = {}) => async (input) => {
  if (!apiKey) throw new Error('Automatic city lookup is unavailable. Add this city in Cities and upload again.');
  const [name, requestedState = ''] = input.split(',').map((part) => part.trim());
  let response;
  try {
    response = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.addressComponents,places.types',
      },
      body: JSON.stringify({ textQuery: `${input}, India`, languageCode: 'en', regionCode: 'IN', pageSize: 5 }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('City lookup is temporarily unavailable. Try importing again.'); }
  if (!response.ok) throw new Error('City lookup failed. Try again or add this city in Cities.');
  const data = await response.json();
  const matches = (data.places || []).filter((place) => {
    const components = place.addressComponents || [];
    const country = components.find((component) => component.types?.includes('country'));
    const state = components.find((component) => component.types?.includes('administrative_area_level_1'));
    const locality = components.find((component) => component.types?.includes('locality'));
    return place.types?.includes('locality') && country?.shortText === 'IN' && state?.longText
      && [place.displayName?.text, locality?.longText].some((value) => normalise(value) === normalise(name))
      && (!requestedState || [state.longText, state.shortText].some((value) => normalise(value) === normalise(requestedState)));
  });
  const unique = [...new Map(matches.map((place) => {
    const state = place.addressComponents.find((component) => component.types?.includes('administrative_area_level_1')).longText;
    return [`${normalise(place.displayName.text)}:${normalise(state)}`, { ...place, state }];
  })).values()];
  if (unique.length !== 1) throw new Error(unique.length
    ? `City "${input}" is ambiguous. Use City, State in the Excel file.`
    : `Could not locate city "${input}". Check its spelling or use City, State.`);
  const place = unique[0];
  const { latitude, longitude } = place.location || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error(`Coordinates for city "${input}" could not be verified. Add it in Cities and try again.`);
  }
  return { name: place.displayName.text, state: place.state, center: { type: 'Point', coordinates: [longitude, latitude] } };
};

module.exports = { createCityGeocoder, resolveCityLocation: createCityGeocoder() };
