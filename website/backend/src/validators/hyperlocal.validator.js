const { Joi, objectId, pagination } = require('./common');

const idParams = Joi.object({ id: objectId.required() });
const list = Joi.object({
  query: Joi.object({ ...pagination, status: Joi.string().trim().max(40), cityId: objectId, search: Joi.string().trim().max(120) }),
});
const city = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(), state: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  latitude: Joi.number().min(-90).max(90).required(), longitude: Joi.number().min(-180).max(180).required(),
  serviceRadiusKm: Joi.number().min(1).max(100).required(), localities: Joi.array().items(Joi.string().trim().max(120)).max(500),
  isActive: Joi.boolean().required(), offersEnabled: Joi.boolean().required(), servicesEnabled: Joi.boolean().required(),
});
const cityCreate = Joi.object({ body: city });
const cityUpdate = Joi.object({ params: idParams, body: city.fork(Object.keys(city.describe().keys), (s) => s.optional()).min(1) });

const worker = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(), photoUrl: Joi.string().trim().allow('').max(2048),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{7,14}$/).required(), cityId: objectId.required(),
  categoryIds: Joi.array().items(objectId.required()).min(1).max(20).required(), experienceYears: Joi.number().min(0).max(60),
  serviceAreas: Joi.array().items(Joi.string().trim().max(120)).max(100), availability: Joi.string().valid('available', 'busy', 'offline'),
  password: Joi.string().min(6).max(120), isActive: Joi.boolean(), verificationStatus: Joi.string().valid('pending', 'verified', 'rejected'), internalNotes: Joi.string().trim().allow('').max(2000),
});
const workerCreate = Joi.object({ body: worker });
const workerUpdate = Joi.object({ params: idParams, body: worker.fork(Object.keys(worker.describe().keys), (s) => s.optional()).min(1) });

const serviceCategory = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(), slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().trim().allow('').max(1000), icon: Joi.string().trim().allow('').max(100), imageUrl: Joi.string().trim().allow('').max(2048),
  basePrice: Joi.number().min(0).required(), priceUnit: Joi.string().valid('fixed', 'hourly', 'inspection').required(),
  // An empty list means this category is available in every enabled city.
  cityAvailability: Joi.array().items(objectId).max(100), isActive: Joi.boolean().required(), sortOrder: Joi.number().integer().min(0),
});
const categoryCreate = Joi.object({ body: serviceCategory });
const categoryUpdate = Joi.object({ params: idParams, body: serviceCategory.fork(Object.keys(serviceCategory.describe().keys), (s) => s.optional()).min(1) });

const businessModerate = Joi.object({
  params: idParams,
  body: Joi.object({ verificationStatus: Joi.string().valid('pending', 'verified', 'rejected', 'suspended'), verificationNote: Joi.string().trim().allow('').max(500), isActive: Joi.boolean() }).min(1),
});
const offerModerate = Joi.object({
  params: idParams,
  body: Joi.object({
    action: Joi.string().valid('approve', 'reject', 'suspend', 'restore', 'feature', 'unfeature').required(), reason: Joi.string().trim().allow('').max(500),
    featuredUntil: Joi.date().iso(), priorityRank: Joi.number().integer().min(0).max(1000),
  }),
});
const templateField = Joi.object({
  key: Joi.string().trim().pattern(/^[a-zA-Z][a-zA-Z0-9_.-]{0,59}$/).required(),
  label: Joi.string().trim().min(2).max(80).required(),
  type: Joi.string().valid('text', 'image', 'number', 'color', 'date', 'select').required(),
  editable: Joi.boolean().required(),
  required: Joi.boolean().required(),
  optional: Joi.boolean().required(),
  maxLength: Joi.number().integer().min(1).max(5000).required(),
  options: Joi.array().items(Joi.string().trim().max(100)).max(50),
  defaultValue: Joi.string().allow('').max(5000),
});
const templateElement = Joi.object({
  id: Joi.string().trim().min(1).max(80).required(),
  type: Joi.string().valid('text', 'image', 'shape', 'rectangle', 'circle', 'line', 'button', 'badge', 'icon', 'divider', 'group').required(),
  key: Joi.string().trim().max(80),
  field: Joi.string().trim().max(80),
  text: Joi.string().allow('').max(5000),
  content: Joi.alternatives().try(Joi.string().allow('').max(5000), Joi.object().unknown(true)),
  imageUrl: Joi.string().trim().allow('').max(7_000_000),
  src: Joi.string().trim().allow('').max(7_000_000),
  position: Joi.object({ x: Joi.number().min(0).max(10000).required(), y: Joi.number().min(0).max(10000).required() }),
  size: Joi.object({ width: Joi.number().positive().max(10000).required(), height: Joi.number().positive().max(10000).required() }),
  x: Joi.number().min(0).max(10000),
  y: Joi.number().min(0).max(10000),
  width: Joi.number().positive().max(10000),
  height: Joi.number().positive().max(10000),
  zIndex: Joi.number().integer().min(-100).max(1000),
  visible: Joi.boolean(),
  locked: Joi.boolean(),
  color: Joi.string().trim().max(100),
  backgroundColor: Joi.string().trim().max(100),
  fontSize: Joi.number().positive().max(500),
  fontWeight: Joi.string().trim().max(30),
  fontFamily: Joi.string().trim().max(100),
  fontStyle: Joi.string().valid('normal', 'italic'),
  letterSpacing: Joi.number().min(-100).max(100),
  lineHeight: Joi.number().positive().max(1000),
  numberOfLines: Joi.number().integer().positive().max(100),
  textAlign: Joi.string().valid('left', 'center', 'right'),
  textAlignVertical: Joi.string().valid('top', 'center', 'bottom'),
  textDecorationLine: Joi.string().valid('none', 'underline', 'line-through', 'underline line-through'),
  textTransform: Joi.string().valid('none', 'uppercase', 'lowercase', 'capitalize'),
  borderRadius: Joi.number().min(0).max(1000),
  borderWidth: Joi.number().min(0).max(1000),
  borderColor: Joi.string().trim().max(100),
  borderStyle: Joi.string().valid('solid', 'dotted', 'dashed'),
  rotation: Joi.number().min(-3600).max(3600),
  opacity: Joi.number().min(0).max(1),
  resizeMode: Joi.string().valid('cover', 'contain', 'stretch'),
  editable: Joi.boolean(),
  style: Joi.object().unknown(true),
}).custom((value, helpers) => {
  const hasFlatGeometry = [value.x, value.y, value.width, value.height].every((item) => typeof item === 'number');
  const hasNestedGeometry = value.position && value.size && typeof value.position.x === 'number' && typeof value.position.y === 'number' && typeof value.size.width === 'number' && typeof value.size.height === 'number';
  if (!hasFlatGeometry && !hasNestedGeometry) return helpers.error('any.custom', { message: 'Elements need x/y/width/height or position/size geometry.' });
  return value;
}).unknown(true);
const templateCanvas = Joi.object({
  width: Joi.number().positive().max(10000).required(),
  height: Joi.number().positive().max(10000).required(),
  backgroundColor: Joi.string().trim().max(100),
  backgroundImageUrl: Joi.string().trim().allow('').max(7_000_000),
  background: Joi.object().unknown(true),
  overlay: Joi.object().unknown(true),
  elements: Joi.array().items(templateElement).max(100).required(),
}).custom((value, helpers) => {
  const ids = new Set();
  for (const element of value.elements) {
    if (ids.has(element.id)) return helpers.error('any.custom', { message: `Duplicate element id: ${element.id}.` });
    ids.add(element.id);
    const x = typeof element.x === 'number' ? element.x : element.position.x;
    const y = typeof element.y === 'number' ? element.y : element.position.y;
    const width = typeof element.width === 'number' ? element.width : element.size.width;
    const height = typeof element.height === 'number' ? element.height : element.size.height;
    if (x + width > value.width || y + height > value.height) return helpers.error('any.custom', { message: `Element ${element.id} is outside the canvas bounds.` });
  }
  return value;
}).unknown(true);
const templatePayload = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(120).required(),
  category: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().allow('').max(500),
  previewUrl: Joi.string().trim().allow('').max(7_000_000),
  canvas: templateCanvas,
  dynamicFields: Joi.object().pattern(
    Joi.string().trim().pattern(/^[a-zA-Z][a-zA-Z0-9_.-]{0,59}$/),
    Joi.alternatives().try(Joi.string().allow('').max(7_000_000), Joi.number(), Joi.boolean(), Joi.array().items(Joi.any()).max(100), Joi.valid(null))
  ).max(100),
  metadata: Joi.any(),
  primaryColor: Joi.string().trim().pattern(/^#[0-9a-fA-F]{6}$/).required(),
  secondaryColor: Joi.string().trim().pattern(/^#[0-9a-fA-F]{6}$/).required(),
  layout: Joi.string().valid('right', 'left', 'bottom', 'center').required(),
  avatarId: Joi.string().trim().max(80).required(),
  editableFields: Joi.array().items(templateField).max(30).required(),
  allowColorChange: Joi.boolean().required(),
  allowLayoutChange: Joi.boolean().required(),
  allowAvatarChange: Joi.boolean().required(),
  isActive: Joi.boolean().required(),
  sortOrder: Joi.number().integer().min(0).max(10000).required(),
});
const templateCreate = Joi.object({ body: templatePayload });
const templateUpdate = Joi.object({ params: idParams, body: templatePayload.fork(Object.keys(templatePayload.describe().keys), (s) => s.optional()).min(1) });

const stickerPayload = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).max(120).required(),
  kind: Joi.string().valid('image', 'emoji').required(),
  imageUrl: Joi.string().trim().allow('').max(7_000_000),
  emoji: Joi.string().trim().allow('').max(20),
  sortOrder: Joi.number().integer().min(0).max(10000).required(),
  isActive: Joi.boolean().required(),
}).custom((value, helpers) => {
  if (value.kind === 'image' && !value.imageUrl) return helpers.error('any.custom', { message: 'Image stickers need an image URL.' });
  if (value.kind === 'emoji' && !value.emoji) return helpers.error('any.custom', { message: 'Emoji stickers need an emoji.' });
  return value;
});
const stickerCreate = Joi.object({ body: stickerPayload });
const stickerUpdate = Joi.object({ params: idParams, body: stickerPayload.fork(Object.keys(stickerPayload.describe().keys), (s) => s.optional()).min(1) });

const plan = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(), code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]+$/).required(),
  description: Joi.string().trim().allow('').max(1000), price: Joi.number().min(0).required(),
  billingPeriod: Joi.string().valid('monthly', 'quarterly', 'yearly', 'custom').required(), durationDays: Joi.number().integer().min(1).max(730).required(),
  offerPostingLimit: Joi.number().integer().min(-1).required(), maximumActiveOffers: Joi.number().integer().min(-1).required(),
  featuredOfferAllowance: Joi.number().integer().min(0).required(), imagesPerOffer: Joi.number().integer().min(1).max(20).required(),
  analyticsAccess: Joi.boolean().required(), priorityRanking: Joi.number().integer().min(0).max(100).required(),
  verificationBenefit: Joi.boolean().required(), isActive: Joi.boolean().required(), sortOrder: Joi.number().integer().min(0),
});
const planCreate = Joi.object({ body: plan });
const planUpdate = Joi.object({ params: idParams, body: plan.fork(Object.keys(plan.describe().keys), (s) => s.optional()).min(1) });

const assignWorker = Joi.object({ params: idParams, body: Joi.object({ workerId: objectId.required() }) });
const forwardBooking = Joi.object({ params: idParams, body: Joi.object({ workerIds: Joi.array().items(objectId.required()).min(1).max(50).required() }) });
const bookingStatus = Joi.object({
  params: idParams,
  body: Joi.object({ status: Joi.string().valid('confirmed', 'in_progress', 'completed', 'cancelled').required(), note: Joi.string().trim().allow('').max(500), finalPrice: Joi.number().min(0) }),
});
const verifyPayment = Joi.object({
  params: idParams,
  body: Joi.object({ providerPaymentId: Joi.string().trim().min(3).max(200).required(), providerOrderId: Joi.string().trim().allow('').max(200), note: Joi.string().trim().allow('').max(500) }),
});
const refundPayment = Joi.object({ params: idParams, body: Joi.object({ reason: Joi.string().trim().min(3).max(500).required() }) });
const providerApplicationApprove = Joi.object({
  params: idParams,
  body: Joi.object({ password: Joi.string().min(6).max(120).required() }),
});
const providerApplicationReject = Joi.object({
  params: idParams,
  body: Joi.object({ reason: Joi.string().trim().allow('').max(500) }),
});

module.exports = {
  list, cityCreate, cityUpdate, workerCreate, workerUpdate, categoryCreate, categoryUpdate,
  businessModerate, offerModerate, templateCreate, templateUpdate, stickerCreate, stickerUpdate, planCreate, planUpdate, assignWorker, forwardBooking, bookingStatus, verifyPayment, refundPayment, providerApplicationApprove, providerApplicationReject,
};
