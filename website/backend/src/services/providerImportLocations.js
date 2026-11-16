const { Types } = require('mongoose');

const normalise = (value) => String(value).normalize('NFKC').toLocaleLowerCase('en-IN').replace(/&/g, 'and').replace(/[^\p{L}\p{N}]/gu, '');
const cleanArea = (value) => value.trim().replace(/\s+/g, ' ');
const areaKey = (value) => cleanArea(value).toLocaleLowerCase('en-IN');
const slugify = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const MAX_AREAS = 500;

const createImportLocations = ({ cities, CityModel, resolveCityLocation }) => {
  const cache = new Map();
  const staged = [...cities];
  const matches = (name) => staged.filter((city) => [city.name, city.slug, `${city.name}, ${city.state}`].some((alias) => normalise(alias) === normalise(name)));
  const active = (city) => {
    if (!city.isActive || !city.servicesEnabled) throw new Error(`City "${city.name}" is disabled for services. Enable it in Cities before importing.`);
    return city;
  };
  const resolve = (name) => {
    const key = normalise(name);
    if (!cache.has(key)) cache.set(key, (async () => {
      const found = matches(name);
      if (found.length > 1) throw new Error(`City "${name}" matches more than one record. Use City, State.`);
      if (found.length) return active(found[0]);
      const location = await resolveCityLocation(name);
      const canonical = matches(`${location.name}, ${location.state}`);
      if (canonical.length > 1) throw new Error(`City "${name}" matches more than one record. Use City, State.`);
      if (canonical.length) return active(canonical[0]);
      const city = {
        _id: new Types.ObjectId(), name: location.name, state: location.state,
        slug: slugify(`${location.name}-${location.state}`), center: location.center,
        localities: [], serviceRadiusKm: 10, isActive: true, servicesEnabled: true, offersEnabled: false, isNewImportCity: true,
      };
      staged.push(city);
      return city;
    })());
    return cache.get(key);
  };

  const save = async (city, values) => {
    const areas = [...new Map(values.map((value) => [areaKey(value), cleanArea(value)])).values()];
    if (new Set([...(city.localities || []), ...areas].map(areaKey)).size > MAX_AREAS) throw new Error(`City "${city.name}" can contain at most ${MAX_AREAS} areas. Split or correct the service areas before importing.`);
    let citiesCreated = 0;
    let saved = city;
    if (city.isNewImportCity) {
      const { isNewImportCity, ...document } = city;
      try {
        saved = await CityModel.findOneAndUpdate({ slug: city.slug }, { $setOnInsert: document }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
        saved = await CityModel.findOne({ slug: city.slug });
      }
      if (!saved) throw new Error(`Could not create city "${city.name}". Try importing again.`);
      active(saved);
      citiesCreated = Number(String(saved._id) === String(city._id));
    }
    if (!areas.length) return { city: saved, citiesCreated, areasCreated: 0 };
    // Merge on the server so concurrent imports preserve each other's areas
    // and case variants do not create duplicate localities.
    const merged = { $reduce: {
      input: { $concatArrays: [{ $ifNull: ['$localities', []] }, { $literal: areas }] }, initialValue: [],
      in: { $cond: [
        { $in: [{ $toLower: '$$this' }, { $map: { input: '$$value', as: 'area', in: { $toLower: '$$area' } } }] },
        '$$value', { $concatArrays: ['$$value', ['$$this']] },
      ] },
    } };
    const previous = await CityModel.findOneAndUpdate(
      { _id: saved._id, isActive: true, servicesEnabled: true, $expr: { $lte: [{ $size: merged }, MAX_AREAS] } },
      [{ $set: { localities: merged, updatedAt: '$$NOW' } }], { new: false },
    );
    if (!previous) throw new Error(`City "${city.name}" was disabled or its ${MAX_AREAS}-area limit was reached. Check Cities and retry.`);
    const existing = new Set((previous.localities || []).map(areaKey));
    return { city: saved, citiesCreated, areasCreated: areas.filter((area) => !existing.has(areaKey(area))).length };
  };
  return { resolve, save };
};

module.exports = { createImportLocations };
