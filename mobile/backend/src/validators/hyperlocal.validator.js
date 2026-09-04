const { Joi, objectId, pagination, phone } = require('./common');

const coordinates = {
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
};

const cityIdParams = Joi.object({ id: objectId.required() });

const listCitiesSchema = Joi.object({
  query: Joi.object({ feature: Joi.string().valid('offers', 'services') }),
});

const cityAvailabilitySchema = Joi.object({
  query: Joi.object({ cityId: objectId, ...coordinates }).xor('cityId', 'latitude'),
});

const businessImageUrl = Joi.string()
  .trim()
  .max(7_000_000)
  .pattern(/^(https:\/\/|data:image\/(png|jpeg|jpg|webp);base64,)/i);

const businessPayload = Joi.object({
  name: Joi.string().trim().min(2).max(140).required(),
  cityId: objectId.required(),
  category: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().allow('').max(2000),
  logoUrl: businessImageUrl.allow(''),
  coverImageUrl: businessImageUrl.allow(''),
  address: Joi.string().trim().min(3).max(300).required(),
  locality: Joi.string().trim().allow('').max(120),
  ...coordinates,
  phone: phone.required(),
  whatsapp: phone.allow(''),
  email: Joi.string().trim().email().allow('').max(200),
  website: Joi.string().trim().uri().allow('').max(2048),
});

const createBusinessSchema = Joi.object({ body: businessPayload });
const updateBusinessSchema = Joi.object({
  params: cityIdParams,
  body: businessPayload.fork(['name', 'cityId', 'category', 'address', 'latitude', 'longitude', 'phone'], (schema) => schema.optional()).min(1),
});

const imageUrl = Joi.string()
  .trim()
  .max(7_000_000)
  .pattern(/^(https:\/\/|data:image\/(png|jpeg|jpg|webp);base64,)/i);

const offerPayload = Joi.object({
  businessId: objectId.required(),
  title: Joi.string().trim().min(3).max(160).required(),
  description: Joi.string().trim().min(5).max(4000).required(),
  category: Joi.string().trim().min(2).max(80).required(),
  originalPrice: Joi.number().min(0).required(),
  offerPrice: Joi.number().min(0).required(),
  discountPercentage: Joi.number().min(0).max(100).required(),
  imageUrls: Joi.array().items(imageUrl).max(20).default([]),
  cardDesign: Joi.object({
    templateId: Joi.string().trim().max(80).required(),
    templateVersion: Joi.number().integer().min(1),
    templateSource: Joi.string().valid('admin', 'system', 'custom'),
    previewUrl: imageUrl,
    canvas: Joi.object({
      width: Joi.number().positive().max(10000),
      height: Joi.number().positive().max(10000),
      backgroundColor: Joi.string().trim().max(100),
      backgroundImageUrl: Joi.string().trim().allow('').max(7_000_000),
      elements: Joi.array().items(Joi.object().unknown(true)).max(100),
    }).unknown(true),
    avatarId: Joi.string().trim().max(80).required(),
    primaryColor: Joi.string().trim().pattern(/^#[0-9a-fA-F]{6}$/).required(),
    secondaryColor: Joi.string().trim().pattern(/^#[0-9a-fA-F]{6}$/).required(),
    layout: Joi.string().valid('right', 'left', 'bottom', 'center').default('right'),
    customizations: Joi.object().unknown(true),
    titleFontSize: Joi.number().integer().min(16).max(56),
    descriptionFontSize: Joi.number().integer().min(11).max(28),
    fontWeight: Joi.string().valid('500', '600', '700', '800', '900'),
    fontStyle: Joi.string().valid('normal', 'italic'),
    textAlign: Joi.string().valid('left', 'center', 'right'),
  }),
  startsAt: Joi.date().iso().required(),
  expiresAt: Joi.date().iso().greater(Joi.ref('startsAt')).required(),
  address: Joi.string().trim().min(3).max(300).required(),
  locality: Joi.string().trim().allow('').max(120),
  ...coordinates,
  phone: phone.allow(''),
  whatsapp: phone.allow(''),
  terms: Joi.string().trim().allow('').max(3000),
});

const createOfferSchema = Joi.object({ body: offerPayload });
const updateOfferSchema = Joi.object({
  params: cityIdParams,
  body: offerPayload.fork(Object.keys(offerPayload.describe().keys), (schema) => schema.optional()).min(1),
});

const nearbyOffersSchema = Joi.object({
  query: Joi.object({
    ...coordinates,
    radiusKm: Joi.number().min(0.1).max(25).default(10),
    cityId: objectId,
    category: Joi.string().trim().max(80),
    search: Joi.string().trim().max(120),
    page: pagination.page,
    limit: pagination.limit,
  }),
});

const offerIdSchema = Joi.object({ params: cityIdParams });
const offerTemplateListSchema = Joi.object({
  query: Joi.object({ category: Joi.string().trim().max(80) }),
});
const offerTemplateIdSchema = Joi.object({ params: cityIdParams });
const offerDetailsSchema = Joi.object({
  params: cityIdParams,
  query: Joi.object({ latitude: Joi.number().min(-90).max(90), longitude: Joi.number().min(-180).max(180) }).and('latitude', 'longitude'),
});
const analyticsSchema = Joi.object({
  params: cityIdParams,
  body: Joi.object({ event: Joi.string().valid('impression', 'view', 'business_profile_visit', 'share', 'call', 'whatsapp', 'directions').required() }),
});

const createPaymentOrderSchema = Joi.object({
  body: Joi.object({ planId: objectId.required(), businessId: objectId.required() }),
});
const createServicePaymentOrderSchema = Joi.object({
  body: Joi.object({ bookingId: objectId.required() }),
});

const listServiceCategoriesSchema = Joi.object({ query: Joi.object({ cityId: objectId.required() }) });
const listProvidersSchema = Joi.object({
  query: Joi.object({
    cityId: objectId.required(),
    categoryId: objectId,
    locality: Joi.string().trim().allow('').max(120),
  }),
});
const createBookingSchema = Joi.object({
  body: Joi.object({
    cityId: objectId.required(),
    categoryId: objectId.required(),
    workerId: objectId,
    address: Joi.string().trim().min(3).max(300).required(),
    locality: Joi.string().trim().allow('').max(120),
    ...coordinates,
    scheduleType: Joi.string().valid('now', 'later').required(),
    scheduledFor: Joi.date().iso().required(),
    problemDescription: Joi.string().trim().allow('').max(2000),
  }),
});
const listBookingsSchema = Joi.object({ query: Joi.object(pagination) });
const bookingIdSchema = Joi.object({ params: cityIdParams });
const cancelBookingSchema = Joi.object({
  params: cityIdParams,
  body: Joi.object({ reason: Joi.string().trim().min(3).max(500).required() }),
});
const rateBookingSchema = Joi.object({
  params: cityIdParams,
  body: Joi.object({ stars: Joi.number().integer().min(1).max(5).required(), review: Joi.string().trim().allow('').max(1000) }),
});
const providerResponseSchema = Joi.object({
  params: cityIdParams,
  body: Joi.object({ response: Joi.string().valid('accepted', 'rejected').required(), note: Joi.string().trim().allow('').max(500) }).required(),
});
const providerStatusSchema = Joi.object({
  params: cityIdParams,
  body: Joi.object({ status: Joi.string().valid('in_progress', 'completed', 'cancelled').required(), finalPrice: Joi.number().min(0), note: Joi.string().trim().allow('').max(500) }).required(),
});
const providerAvailabilitySchema = Joi.object({
  body: Joi.object({ availability: Joi.string().valid('available', 'offline').required() }).required(),
});

module.exports = {
  listCitiesSchema,
  cityAvailabilitySchema,
  createBusinessSchema,
  updateBusinessSchema,
  nearbyOffersSchema,
  createOfferSchema,
  updateOfferSchema,
  offerIdSchema,
  offerTemplateListSchema,
  offerTemplateIdSchema,
  offerDetailsSchema,
  analyticsSchema,
  createPaymentOrderSchema,
  createServicePaymentOrderSchema,
  listServiceCategoriesSchema,
  listProvidersSchema,
  createBookingSchema,
  listBookingsSchema,
  bookingIdSchema,
  cancelBookingSchema,
  rateBookingSchema,
  providerResponseSchema,
  providerStatusSchema,
  providerAvailabilitySchema,
};
