const City = require('../models/City');
const ServiceCategory = require('../models/ServiceCategory');
const ProviderApplication = require('../models/ProviderApplication');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeIndianPhone } = require('../utils/phoneValidation');
const { verifyOauthProfile } = require('../services/oauthService');

const createProviderApplication = asyncHandler(async (req, res) => {
  const { name, phone, email, cityId, categoryIds, experienceYears, serviceAreas, message, termsAccepted, oauthProvider, oauthToken } = req.body || {};
  const normalizedPhone = normalizeIndianPhone(phone);
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (oauthProvider) {
    const profile = await verifyOauthProfile(oauthProvider, oauthToken);
    if (profile.email !== normalizedEmail) {
      throw new ApiError(422, 'Email must match the verified Google account email', 'OAUTH_EMAIL_MISMATCH');
    }
  }
  if (!name || String(name).trim().length < 2) throw new ApiError(422, 'Name is required', 'PROVIDER_NAME_REQUIRED');
  if (!normalizedPhone) throw new ApiError(422, 'Enter exactly 10 local digits for the phone number', 'PROVIDER_PHONE_INVALID');
  if (!cityId || !Array.isArray(categoryIds) || !categoryIds.length) throw new ApiError(422, 'City and at least one skill are required', 'PROVIDER_DETAILS_REQUIRED');
  if (!normalizedEmail) throw new ApiError(422, 'Email is required', 'PROVIDER_EMAIL_REQUIRED');
  if (categoryIds.length > 20) throw new ApiError(422, 'Select up to 20 skills', 'PROVIDER_CATEGORY_LIMIT');
  if (termsAccepted !== true) throw new ApiError(422, 'Please accept the verification terms', 'PROVIDER_TERMS_REQUIRED');

  const cleanAreas = Array.isArray(serviceAreas)
    ? [...new Set(serviceAreas.map((area) => String(area).trim()).filter(Boolean))].slice(0, 100)
    : [];
  const cleanMessage = String(message || '').trim();
  if (!cleanAreas.length) throw new ApiError(422, 'At least one service area is required', 'PROVIDER_SERVICE_AREAS_REQUIRED');
  if (!cleanMessage) throw new ApiError(422, 'Tell us about your work', 'PROVIDER_WORK_DESCRIPTION_REQUIRED');

  const [city, categories, existingPhoneUser, existingEmailUser, pendingApplication] = await Promise.all([
    City.findOne({ _id: cityId, isActive: true, servicesEnabled: true }),
    ServiceCategory.find({ _id: { $in: categoryIds }, isActive: true }),
    User.findOne({ phone: { $in: [normalizedPhone, normalizedPhone.replace(/^\+91/, '')] } }).select('_id'),
    User.findOne({ email: normalizedEmail }).select('_id'),
    ProviderApplication.findOne({ $or: [{ phone: normalizedPhone }, { email: normalizedEmail }], status: 'pending' }).select('_id'),
  ]);
  if (!city) throw new ApiError(422, 'Selected city is not accepting service providers', 'PROVIDER_CITY_UNAVAILABLE');
  if (categories.length !== new Set(categoryIds.map(String)).size) throw new ApiError(422, 'One or more selected skills are invalid', 'PROVIDER_CATEGORY_INVALID');
  if (existingPhoneUser) throw new ApiError(409, 'This phone number already has an account', 'PROVIDER_PHONE_IN_USE');
  if (existingEmailUser) throw new ApiError(409, 'This email already has an account', 'PROVIDER_EMAIL_IN_USE');
  if (pendingApplication) throw new ApiError(409, 'Your provider application is already under review', 'PROVIDER_APPLICATION_EXISTS');

  const application = await ProviderApplication.create({
    name: String(name).trim(), phone: normalizedPhone, email: normalizedEmail, city: city._id,
    categories: [...new Set(categoryIds.map(String))], experienceYears: Math.max(0, Number(experienceYears) || 0),
    serviceAreas: cleanAreas, message: cleanMessage, termsAccepted: true,
  });
  res.status(201).json({ success: true, application: { _id: application._id, status: application.status, createdAt: application.createdAt } });
});

module.exports = { createProviderApplication };
