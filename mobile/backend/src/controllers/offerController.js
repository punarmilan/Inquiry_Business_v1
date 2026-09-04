const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Business = require('../models/Business');
const City = require('../models/City');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const OfferTemplate = require('../models/OfferTemplate');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const { distanceKm } = require('../domain/rules');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const nearbyOffers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const now = new Date();
  const query = {
    status: 'approved',
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  };
  if (req.query.cityId) query.city = new mongoose.Types.ObjectId(req.query.cityId);
  if (req.query.category && req.query.category.toLowerCase() !== 'all') query.category = req.query.category;
  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(req.query.longitude), Number(req.query.latitude)] },
        distanceField: 'distanceMeters',
        maxDistance: Math.min(Number(req.query.radiusKm || 10), 25) * 1000,
        spherical: true,
        query,
      },
    },
    { $lookup: { from: 'cities', localField: 'city', foreignField: '_id', as: 'cityDocument' } },
    { $unwind: '$cityDocument' },
    { $match: { 'cityDocument.isActive': true, 'cityDocument.offersEnabled': true } },
    { $lookup: { from: 'businesses', localField: 'business', foreignField: '_id', as: 'businessDocument' } },
    { $unwind: '$businessDocument' },
    {
      $match: {
        'businessDocument.isActive': true,
        'businessDocument.verificationStatus': 'verified',
      },
    },
  ];
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search), 'i');
    pipeline.push({
      $match: {
        $or: [{ title: search }, { category: search }, { 'businessDocument.name': search }, { 'businessDocument.category': search }],
      },
    });
  }
  pipeline.push(
    {
      $addFields: {
        distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
        sponsoredRank: {
          $cond: [
            { $and: ['$isFeatured', { $gt: ['$featuredUntil', now] }] },
            1,
            0,
          ],
        },
      },
    },
    { $sort: { sponsoredRank: -1, priorityRank: -1, distanceMeters: 1, createdAt: -1 } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              analytics: 0,
              moderatedBy: 0,
              moderationReason: 0,
              'businessDocument.verificationNote': 0,
            },
          },
        ],
        meta: [{ $count: 'total' }],
      },
    }
  );
  const [result] = await Offer.aggregate(pipeline);
  const total = result?.meta[0]?.total || 0;
  if (result?.data.length) {
    Offer.updateMany({ _id: { $in: result.data.map((item) => item._id) } }, { $inc: { 'analytics.impressions': 1 } }).catch(() => {});
  }
  const availableCities = total === 0
    ? await City.find({ isActive: true, offersEnabled: true }).select('name state slug').sort({ name: 1 })
    : [];
  res.json({
    success: true,
    ...paginatedResponse({ data: result?.data || [], total, page, limit }),
    radiusKm: Math.min(Number(req.query.radiusKm || 10), 25),
    comingSoon: Boolean(req.query.cityId && total === 0 && !(await City.exists({ _id: req.query.cityId, isActive: true, offersEnabled: true }))),
    availableCities,
  });
});

const publicOffer = async (offerId) => {
  const now = new Date();
  return Offer.findOne({ _id: offerId, status: 'approved', isActive: true, startsAt: { $lte: now }, expiresAt: { $gte: now } })
    .select('-moderatedBy -moderationReason')
    .populate({ path: 'city', match: { isActive: true, offersEnabled: true }, select: 'name state slug' })
    .populate({ path: 'business', match: { isActive: true, verificationStatus: 'verified' }, select: '-verificationNote' });
};

const getOffer = asyncHandler(async (req, res) => {
  const offer = await publicOffer(req.params.id);
  if (!offer || !offer.city || !offer.business) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  let offerDistanceKm = null;
  if (req.query.latitude !== undefined) {
    offerDistanceKm = distanceKm(
      { latitude: Number(req.query.latitude), longitude: Number(req.query.longitude) },
      { latitude: offer.location.coordinates[1], longitude: offer.location.coordinates[0] }
    );
    if (offerDistanceKm > 25) throw new ApiError(404, 'Offer is outside your 25 KM area', 'OFFER_OUTSIDE_RADIUS');
  }
  await Offer.updateOne({ _id: offer._id }, { $inc: { 'analytics.views': 1 } });
  res.json({ success: true, offer: { ...offer.toJSON(), distanceKm: offerDistanceKm === null ? null : Number(offerDistanceKm.toFixed(1)) } });
});

const reservePostingQuota = async (businessId, ownerId) => {
  const now = new Date();
  const subscription = await Subscription.findOne({
    business: businessId,
    owner: ownerId,
    status: 'active',
    startsAt: { $lte: now },
    endsAt: { $gte: now },
  }).sort({ endsAt: -1 });
  if (!subscription) throw new ApiError(402, 'An active eligible plan is required to post offers', 'ACTIVE_PLAN_REQUIRED');
  const limit = subscription.quota.offerPostingLimit;
  const filter = { _id: subscription._id, status: 'active', endsAt: { $gte: now } };
  if (limit !== -1) filter['usage.offersPosted'] = { $lt: limit };
  const reserved = await Subscription.findOneAndUpdate(filter, { $inc: { 'usage.offersPosted': 1 } }, { new: true });
  if (!reserved) throw new ApiError(409, 'Your offer posting quota has been reached', 'OFFER_QUOTA_REACHED');
  return reserved;
};

const isFilled = (value) => value !== undefined && value !== null && String(value).trim().length > 0;

// Admin templates provide a safe design contract. The mobile client can render the
// editor freely, but the API remains the source of truth for locked style controls
// and required fields.
const applyTemplateRules = async (cardDesign, payload, existingOffer = null) => {
  if (!cardDesign?.templateId || cardDesign.templateSource === 'custom' || !mongoose.Types.ObjectId.isValid(cardDesign.templateId)) {
    return { cardDesign, payload };
  }
  const template = await OfferTemplate.findOne({ _id: cardDesign.templateId, ...(existingOffer ? {} : { isActive: true }) });
  if (!template) throw new ApiError(422, 'The selected offer template is no longer available', 'TEMPLATE_NOT_FOUND');

  const resolvedDesign = {
    ...cardDesign,
    templateVersion: template.version,
    templateSource: 'admin',
    primaryColor: template.allowColorChange ? cardDesign.primaryColor : template.primaryColor,
    secondaryColor: template.allowColorChange ? cardDesign.secondaryColor : template.secondaryColor,
    layout: template.allowLayoutChange ? cardDesign.layout : template.layout,
    avatarId: template.allowAvatarChange ? cardDesign.avatarId : template.avatarId,
  };
  const resolvedPayload = { ...payload };
  for (const field of template.editableFields || []) {
    const incoming = payload[field.key];
    const previous = existingOffer ? existingOffer[field.key] : undefined;
    if (field.required && !isFilled(incoming ?? previous ?? field.defaultValue)) {
      throw new ApiError(422, `${field.label} is required for this template`, 'TEMPLATE_FIELD_REQUIRED');
    }
    if (field.maxLength && typeof incoming === 'string' && incoming.length > field.maxLength) {
      throw new ApiError(422, `${field.label} is too long for this template`, 'TEMPLATE_FIELD_TOO_LONG');
    }
    if (field.editable === false) {
      if (existingOffer && incoming !== undefined && String(incoming) !== String(previous ?? '')) {
        throw new ApiError(422, `${field.label} is locked by the template`, 'TEMPLATE_FIELD_LOCKED');
      }
      if (!existingOffer && field.defaultValue !== undefined && field.defaultValue !== '') resolvedPayload[field.key] = field.defaultValue;
    }
  }
  return { cardDesign: resolvedDesign, payload: resolvedPayload };
};

const createOffer = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ _id: req.body.businessId, owner: req.user._id, isActive: true });
  if (!business) throw new ApiError(404, 'Business not found', 'BUSINESS_NOT_FOUND');
  if (business.verificationStatus !== 'verified') {
    throw new ApiError(403, 'Business profile approval is required before posting. Admin review usually takes up to 24 hours.', 'BUSINESS_NOT_VERIFIED');
  }
  const city = await City.findOne({ _id: business.city, isActive: true, offersEnabled: true });
  if (!city) throw new ApiError(422, 'Offers are not available in this city', 'OFFERS_CITY_UNAVAILABLE');
  if (Number(req.body.offerPrice) > Number(req.body.originalPrice)) {
    throw new ApiError(422, 'Offer price cannot exceed original price', 'INVALID_OFFER_PRICE');
  }
  const templateResult = await applyTemplateRules(req.body.cardDesign, req.body);
  const subscription = await reservePostingQuota(business._id, req.user._id);
  if ((req.body.imageUrls || []).length > subscription.quota.imagesPerOffer) {
    await Subscription.updateOne({ _id: subscription._id }, { $inc: { 'usage.offersPosted': -1 } });
    throw new ApiError(422, `Your plan allows ${subscription.quota.imagesPerOffer} images per offer`, 'IMAGE_LIMIT_EXCEEDED');
  }
  const activeOfferCount = await Offer.countDocuments({
    business: business._id,
    isActive: true,
    status: { $in: ['pending_review', 'approved'] },
    expiresAt: { $gte: new Date() },
  });
  if (subscription.quota.maximumActiveOffers !== -1 && activeOfferCount >= subscription.quota.maximumActiveOffers) {
    await Subscription.updateOne({ _id: subscription._id }, { $inc: { 'usage.offersPosted': -1 } });
    throw new ApiError(409, 'Your maximum active offer limit has been reached', 'ACTIVE_OFFER_LIMIT_REACHED');
  }
  try {
    const offer = await Offer.create({
      business: business._id,
      owner: req.user._id,
      city: business.city,
      subscription: subscription._id,
      title: templateResult.payload.title,
      description: templateResult.payload.description,
      category: templateResult.payload.category,
      originalPrice: templateResult.payload.originalPrice,
      offerPrice: templateResult.payload.offerPrice,
      discountPercentage: templateResult.payload.discountPercentage,
      imageUrls: templateResult.payload.imageUrls,
      cardDesign: templateResult.cardDesign,
      startsAt: templateResult.payload.startsAt,
      expiresAt: templateResult.payload.expiresAt,
      address: templateResult.payload.address,
      locality: templateResult.payload.locality,
      location: { type: 'Point', coordinates: [Number(req.body.longitude), Number(req.body.latitude)] },
      phone: templateResult.payload.phone,
      whatsapp: templateResult.payload.whatsapp,
      terms: templateResult.payload.terms,
      priorityRank: 0,
      // A paid, active plan grants posting eligibility. Every new offer still
      // waits for an admin decision before it can appear in discovery.
      status: 'pending_review',
      isFeatured: false,
    });
    res.status(201).json({ success: true, offer });
  } catch (error) {
    await Subscription.updateOne({ _id: subscription._id }, { $inc: { 'usage.offersPosted': -1 } });
    throw error;
  }
});

const listMine = asyncHandler(async (req, res) => {
  const offers = await Offer.find({ owner: req.user._id, isActive: true })
    .populate('business', 'name logoUrl verificationStatus')
    .populate('city', 'name state')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: offers });
});

const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, owner: req.user._id, isActive: true });
  if (!offer) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  if (offer.status === 'suspended') {
    throw new ApiError(409, 'This offer was removed by Admin and cannot be edited', 'OFFER_EDIT_NOT_ALLOWED');
  }
  const originalPrice = req.body.originalPrice ?? offer.originalPrice;
  const offerPrice = req.body.offerPrice ?? offer.offerPrice;
  if (Number(offerPrice) > Number(originalPrice)) {
    throw new ApiError(422, 'Offer price cannot exceed original price', 'INVALID_OFFER_PRICE');
  }
  const templateResult = await applyTemplateRules(req.body.cardDesign || offer.cardDesign, req.body, offer);
  const allowed = ['title', 'description', 'category', 'originalPrice', 'offerPrice', 'discountPercentage', 'imageUrls', 'cardDesign', 'startsAt', 'expiresAt', 'address', 'locality', 'phone', 'whatsapp', 'terms'];
  allowed.forEach((key) => templateResult.payload[key] !== undefined && (offer[key] = key === 'cardDesign' ? templateResult.cardDesign : templateResult.payload[key]));
  if (req.body.longitude !== undefined) offer.location = { type: 'Point', coordinates: [Number(req.body.longitude), Number(req.body.latitude)] };
  // Any content change must be reviewed again before the revised offer is
  // visible. This also lets a rejected offer be corrected and resubmitted.
  offer.status = 'pending_review';
  offer.moderationReason = '';
  offer.moderatedAt = null;
  offer.moderatedBy = null;
  await offer.save();
  res.json({ success: true, offer });
});

const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findOne({ _id: req.params.id, owner: req.user._id, isActive: true });
  if (!offer) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  offer.isActive = false;
  offer.status = 'suspended';
  offer.moderationReason = 'Deleted by business owner';
  await offer.save();
  res.json({ success: true, message: 'Offer deleted' });
});

const toggleSave = asyncHandler(async (req, res) => {
  const offer = await publicOffer(req.params.id);
  if (!offer || !offer.city || !offer.business) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  const alreadySaved = req.user.savedOffers?.some((id) => String(id) === String(offer._id));
  await User.updateOne(
    { _id: req.user._id },
    alreadySaved ? { $pull: { savedOffers: offer._id } } : { $addToSet: { savedOffers: offer._id } }
  );
  await Offer.updateOne({ _id: offer._id }, { $inc: { 'analytics.saves': alreadySaved ? -1 : 1 } });
  res.json({ success: true, saved: !alreadySaved });
});

const listSaved = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('savedOffers');
  const now = new Date();
  const offers = await Offer.find({ _id: { $in: user.savedOffers || [] }, status: 'approved', isActive: true, expiresAt: { $gte: now } })
    .populate('business', 'name logoUrl verificationStatus')
    .populate('city', 'name state offersEnabled isActive')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: offers.filter((offer) => offer.city?.isActive && offer.city?.offersEnabled) });
});

const recordAnalytics = asyncHandler(async (req, res) => {
  const paths = {
    impression: 'analytics.impressions', view: 'analytics.views', business_profile_visit: 'analytics.businessProfileVisits',
    share: 'analytics.shares', call: 'analytics.callClicks', whatsapp: 'analytics.whatsappClicks', directions: 'analytics.directionClicks',
  };
  const offer = await publicOffer(req.params.id);
  if (!offer || !offer.city || !offer.business) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  await Offer.updateOne({ _id: offer._id }, { $inc: { [paths[req.body.event]]: 1 } });
  res.status(204).send();
});

module.exports = { nearbyOffers, getOffer, createOffer, listMine, updateOffer, deleteOffer, toggleSave, listSaved, recordAnalytics };
