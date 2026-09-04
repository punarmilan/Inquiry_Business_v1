const crypto = require('crypto');
const Business = require('../models/Business');
const City = require('../models/City');
const Offer = require('../models/Offer');
const Subscription = require('../models/Subscription');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const slugify = (value) =>
  `${value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${crypto.randomBytes(3).toString('hex')}`;

const payloadFromBody = (body) => ({
  name: body.name,
  city: body.cityId,
  category: body.category,
  description: body.description,
  logoUrl: body.logoUrl,
  coverImageUrl: body.coverImageUrl,
  address: body.address,
  locality: body.locality,
  location:
    body.longitude === undefined
      ? undefined
      : { type: 'Point', coordinates: [Number(body.longitude), Number(body.latitude)] },
  phone: body.phone,
  whatsapp: body.whatsapp,
  email: body.email,
  website: body.website,
});

const assertSupportedCity = async (cityId) => {
  const city = await City.findOne({ _id: cityId, isActive: true, offersEnabled: true });
  if (!city) {
    throw new ApiError(422, 'Offers are not available in this city yet', 'OFFERS_CITY_UNAVAILABLE');
  }
  return city;
};

const createBusiness = asyncHandler(async (req, res) => {
  await assertSupportedCity(req.body.cityId);
  const business = await Business.create({
    ...payloadFromBody(req.body),
    owner: req.user._id,
    slug: slugify(req.body.name),
    verificationStatus: 'pending',
    verificationSubmittedAt: new Date(),
  });
  res.status(201).json({ success: true, business });
});

const listMine = asyncHandler(async (req, res) => {
  const businesses = await Business.find({ owner: req.user._id })
    .populate('city', 'name state slug offersEnabled servicesEnabled')
    .sort({ createdAt: -1 });
  const now = new Date();
  const subscriptions = await Subscription.find({
    owner: req.user._id,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).populate('plan', 'name code price');
  const byBusiness = new Map(subscriptions.map((item) => [item.business.toString(), item]));
  res.json({
    success: true,
    data: businesses.map((business) => ({ ...business.toJSON(), activeSubscription: byBusiness.get(business._id.toString()) || null })),
  });
});

const getBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ _id: req.params.id, isActive: true })
    .select('-verificationNote')
    .populate('city', 'name state slug offersEnabled');
  if (!business || !business.city?.offersEnabled) throw new ApiError(404, 'Business not found', 'BUSINESS_NOT_FOUND');
  const now = new Date();
  const offers = await Offer.find({
    business: business._id,
    status: 'approved',
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  }).select('-analytics').sort({ isFeatured: -1, priorityRank: -1, createdAt: -1 });
  res.json({ success: true, business, offers });
});

const updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ _id: req.params.id, owner: req.user._id });
  if (!business) throw new ApiError(404, 'Business not found', 'BUSINESS_NOT_FOUND');
  if (req.body.cityId && String(req.body.cityId) !== String(business.city)) await assertSupportedCity(req.body.cityId);
  const payload = payloadFromBody(req.body);
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  Object.assign(business, payload);
  // Every profile edit needs a fresh review, including edits to a previously
  // rejected profile. Existing businesses remain visible to the owner while
  // the updated profile is reviewed.
  business.verificationStatus = 'pending';
  business.verificationSubmittedAt = new Date();
  business.verifiedAt = null;
  business.verificationNote = '';
  business.moderatedAt = null;
  business.moderatedBy = null;
  await business.save();
  res.json({ success: true, business });
});

module.exports = { createBusiness, listMine, getBusiness, updateBusiness };
