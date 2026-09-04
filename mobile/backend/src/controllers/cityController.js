const City = require('../models/City');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { distanceKm } = require('../domain/rules');

const publicFields = 'name state slug center serviceRadiusKm localities isActive offersEnabled servicesEnabled';

const listCities = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.feature === 'offers') filter.offersEnabled = true;
  if (req.query.feature === 'services') filter.servicesEnabled = true;
  const cities = await City.find(filter).select(publicFields).sort({ name: 1 });
  res.json({ success: true, data: cities });
});

const getAvailability = asyncHandler(async (req, res) => {
  let city;
  if (req.query.cityId) {
    city = await City.findById(req.query.cityId).select(publicFields);
    if (!city) throw new ApiError(404, 'City not found', 'CITY_NOT_FOUND');
  } else {
    const allCities = await City.find({ isActive: true }).select(publicFields);
    const userLocation = {
      latitude: Number(req.query.latitude),
      longitude: Number(req.query.longitude),
    };
    city = allCities
      .map((candidate) => ({
        candidate,
        distance: distanceKm(userLocation, {
          latitude: candidate.center.coordinates[1],
          longitude: candidate.center.coordinates[0],
        }),
      }))
      .filter(({ candidate, distance }) => distance <= candidate.serviceRadiusKm)
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
  }

  const availableCities = await City.find({ isActive: true }).select(publicFields).sort({ name: 1 });
  res.json({
    success: true,
    city: city || null,
    supported: Boolean(city?.isActive && (city.offersEnabled || city.servicesEnabled)),
    offersAvailable: Boolean(city?.isActive && city.offersEnabled),
    servicesAvailable: Boolean(city?.isActive && city.servicesEnabled),
    comingSoon: !city || !city.isActive || (!city.offersEnabled && !city.servicesEnabled),
    message: !city || !city.isActive || (!city.offersEnabled && !city.servicesEnabled) ? "We're coming to your city soon." : '',
    availableCities,
  });
});

module.exports = { listCities, getAvailability };
