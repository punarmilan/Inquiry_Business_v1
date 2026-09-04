const bcrypt = require('bcryptjs');
const City = require('../models/City');
const Business = require('../models/Business');
const Offer = require('../models/Offer');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const ServiceCategory = require('../models/ServiceCategory');
const Worker = require('../models/Worker');
const ProviderApplication = require('../models/ProviderApplication');
const ServiceBooking = require('../models/ServiceBooking');
const OfferTemplate = require('../models/OfferTemplate');
const TemplateAsset = require('../models/TemplateAsset');
const TemplateSticker = require('../models/TemplateSticker');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, paginatedResponse } = require('../utils/pagination');

// No socket server on this service — this only persists the notification for the mobile
// app to pick up on its next fetch, unlike mobile-backend's notifyUser which also pushes
// live over Socket.IO. Best-effort: an admin action must never fail because of this.
const notifyUser = ({ userId, type, title, body, data }) =>
  Notification.create({ user: userId, type, title, body, data }).catch(() => {});

const paginated = async ({ model, filter = {}, query, populate = [], sort = { createdAt: -1 } }) => {
  const { page, limit, skip } = getPagination(query);
  let cursor = model.find(filter).sort(sort).skip(skip).limit(limit);
  populate.forEach((item) => (cursor = cursor.populate(item)));
  const [data, total] = await Promise.all([cursor, model.countDocuments(filter)]);
  return paginatedResponse({ data, total, page, limit });
};

const normalizeLocalities = (localities = []) => {
  const unique = new Map();
  localities.forEach((value) => {
    const clean = value.trim().replace(/\s+/g, ' ');
    if (clean) unique.set(clean.toLocaleLowerCase('en-IN'), clean);
  });
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'en-IN'));
};
const normalizeProviderPhone = (phone) => {
  const value = String(phone || '').replace(/[\s-]/g, '');
  return /^\d{10}$/.test(value) ? `+91${value}` : value;
};
const normalizeArea = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');

const listCities = asyncHandler(async (_req, res) => res.json({ success: true, data: await City.find().sort({ name: 1 }) }));
const createCity = asyncHandler(async (req, res) => {
  const city = await City.create({
    ...req.body,
    localities: normalizeLocalities(req.body.localities),
    center: { type: 'Point', coordinates: [req.body.longitude, req.body.latitude] },
  });
  res.status(201).json({ success: true, city });
});
const updateCity = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.localities) payload.localities = normalizeLocalities(payload.localities);
  if (payload.longitude !== undefined) payload.center = { type: 'Point', coordinates: [payload.longitude, payload.latitude] };
  delete payload.longitude; delete payload.latitude;
  const city = await City.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true });
  if (!city) throw new ApiError(404, 'City not found', 'CITY_NOT_FOUND');
  res.json({ success: true, city });
});

const listWorkers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.cityId) filter.city = req.query.cityId;
  if (req.query.status) filter.verificationStatus = req.query.status;
  res.json({ success: true, ...(await paginated({ model: Worker, filter, query: req.query, populate: ['city', 'categories', 'user'] })) });
});
const listProviderApplications = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.cityId) filter.city = req.query.cityId;
  if (req.query.search) {
    const search = String(req.query.search).trim();
    filter.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  }
  res.json({
    success: true,
    ...(await paginated({ model: ProviderApplication, filter, query: req.query, populate: ['city', 'categories', 'reviewedBy', 'approvedUser', 'approvedWorker'] })),
  });
});
const approveProviderApplication = asyncHandler(async (req, res) => {
  const application = await ProviderApplication.findById(req.params.id).populate(['city', 'categories']);
  if (!application) throw new ApiError(404, 'Provider application not found', 'PROVIDER_APPLICATION_NOT_FOUND');
  if (application.status === 'approved' && application.approvedWorker) return res.json({ success: true, application });
  if (application.status !== 'pending') throw new ApiError(409, 'Only pending applications can be approved', 'PROVIDER_APPLICATION_NOT_PENDING');

  const providerPhone = normalizeProviderPhone(application.phone);
  if (!req.body.password || String(req.body.password).length < 6) throw new ApiError(422, 'Set a provider password of at least 6 characters', 'PROVIDER_PASSWORD_REQUIRED');
  const existingUser = await User.findOne({ phone: { $in: [providerPhone, providerPhone.replace(/^\+91/, '')] } });
  if (existingUser) throw new ApiError(409, 'This phone number already belongs to an account', 'PROVIDER_PHONE_IN_USE');

  const user = await User.create({
    name: application.name,
    phone: providerPhone,
    email: application.email || undefined,
    passwordHash: await bcrypt.hash(String(req.body.password), 12),
    role: 'worker', accountType: 'worker', isActive: true, termsAccepted: true, termsAcceptedAt: new Date(),
  });
  try {
    const worker = await Worker.create({
      user: user._id, name: application.name, phone: providerPhone,
      city: application.city._id, categories: application.categories.map((category) => category._id),
      experienceYears: application.experienceYears, serviceAreas: application.serviceAreas,
      availability: 'offline', isActive: true, verificationStatus: 'verified',
    });
    application.status = 'approved';
    application.reviewedBy = req.admin._id;
    application.reviewedAt = new Date();
    application.approvedUser = user._id;
    application.approvedWorker = worker._id;
    application.rejectionReason = '';
    await application.save();
    return res.json({ success: true, application: await application.populate(['city', 'categories', 'approvedWorker']) });
  } catch (error) {
    await User.deleteOne({ _id: user._id, role: 'worker' });
    throw error;
  }
});
const rejectProviderApplication = asyncHandler(async (req, res) => {
  const application = await ProviderApplication.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Provider application not found', 'PROVIDER_APPLICATION_NOT_FOUND');
  if (application.status !== 'pending') throw new ApiError(409, 'Only pending applications can be rejected', 'PROVIDER_APPLICATION_NOT_PENDING');
  application.status = 'rejected'; application.rejectionReason = String(req.body.reason || '').trim();
  application.reviewedBy = req.admin._id; application.reviewedAt = new Date();
  await application.save();
  res.json({ success: true, application });
});
const createWorker = asyncHandler(async (req, res) => {
  const providerPhone = normalizeProviderPhone(req.body.phone);
  const [city, categoryCount, existingUser] = await Promise.all([
    City.findById(req.body.cityId),
    ServiceCategory.countDocuments({ _id: { $in: req.body.categoryIds }, isActive: true }),
    User.findOne({ phone: { $in: [providerPhone, providerPhone.replace(/^\+91/, '')] } }),
  ]);
  if (!city?.isActive || !city.servicesEnabled) throw new ApiError(422, 'Worker city must have services enabled', 'WORKER_CITY_UNAVAILABLE');
  if (categoryCount !== req.body.categoryIds.length) throw new ApiError(422, 'One or more service categories are invalid', 'WORKER_CATEGORY_INVALID');
  if (existingUser) throw new ApiError(409, 'Phone already belongs to an account', 'WORKER_PHONE_IN_USE');
  if (!req.body.password || req.body.password.length < 6) throw new ApiError(422, 'Provider password must be at least 6 characters', 'WORKER_PASSWORD_REQUIRED');
  const user = await User.create({ name: req.body.name, phone: providerPhone, passwordHash: await bcrypt.hash(req.body.password, 12), role: 'worker', accountType: 'worker', isActive: true });
  try {
    const worker = await Worker.create({
      user: user._id, name: req.body.name, photoUrl: req.body.photoUrl, phone: providerPhone,
      city: req.body.cityId, categories: req.body.categoryIds, experienceYears: req.body.experienceYears,
      serviceAreas: req.body.serviceAreas, availability: req.body.availability || 'offline', isActive: req.body.isActive ?? true,
      verificationStatus: req.body.verificationStatus || 'pending', internalNotes: req.body.internalNotes,
    });
    return res.status(201).json({ success: true, worker: await worker.populate(['city', 'categories', 'user']) });
  } catch (error) {
    await User.deleteOne({ _id: user._id, role: 'worker' });
    throw error;
  }
});
const updateWorker = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id).select('+internalNotes');
  if (!worker) throw new ApiError(404, 'Worker not found', 'WORKER_NOT_FOUND');
  if (req.body.cityId) {
    const city = await City.findOne({ _id: req.body.cityId, isActive: true, servicesEnabled: true });
    if (!city) throw new ApiError(422, 'Worker city must have services enabled', 'WORKER_CITY_UNAVAILABLE');
    worker.city = req.body.cityId;
  }
  if (req.body.categoryIds) worker.categories = req.body.categoryIds;
  ['name', 'photoUrl', 'experienceYears', 'serviceAreas', 'availability', 'isActive', 'verificationStatus', 'internalNotes'].forEach(
    (key) => req.body[key] !== undefined && (worker[key] = req.body[key])
  );
  await worker.save();
  const userUpdate = { name: worker.name, isActive: worker.isActive };
  if (req.body.password) userUpdate.passwordHash = await bcrypt.hash(req.body.password, 12);
  await User.updateOne({ _id: worker.user }, { $set: userUpdate });
  res.json({ success: true, worker });
});

const listServiceCategories = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: await ServiceCategory.find().populate('cityAvailability', 'name state').sort({ sortOrder: 1, name: 1 }) })
);
const createServiceCategory = asyncHandler(async (req, res) => {
  const category = await ServiceCategory.create(req.body);
  res.status(201).json({ success: true, category });
});
const updateServiceCategory = asyncHandler(async (req, res) => {
  const category = await ServiceCategory.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Service category not found', 'SERVICE_CATEGORY_NOT_FOUND');
  res.json({ success: true, category });
});

const listBusinesses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.cityId) filter.city = req.query.cityId;
  if (req.query.status) filter.verificationStatus = req.query.status;
  res.json({ success: true, ...(await paginated({ model: Business, filter, query: req.query, populate: ['owner', 'city'] })) });
});
const moderateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw new ApiError(404, 'Business not found', 'BUSINESS_NOT_FOUND');
  if (req.body.verificationStatus !== undefined) business.verificationStatus = req.body.verificationStatus;
  if (req.body.verificationNote !== undefined) business.verificationNote = req.body.verificationNote;
  if (req.body.isActive !== undefined) business.isActive = req.body.isActive;
  business.moderatedAt = new Date();
  business.moderatedBy = req.admin._id;
  if (business.verificationStatus === 'verified') {
    business.verifiedAt = new Date();
    business.verificationNote = '';
  } else {
    business.verifiedAt = null;
  }
  await business.save();
  if (business.verificationStatus === 'verified') {
    notifyUser({ userId: business.owner, type: 'business_approved', title: 'Business profile approved', body: `${business.name} is approved. You can now post offers.`, data: { businessId: business._id.toString() } });
  } else if (business.verificationStatus === 'rejected') {
    notifyUser({ userId: business.owner, type: 'business_rejected', title: 'Business profile needs changes', body: business.verificationNote || 'Please update your business profile and resubmit it.', data: { businessId: business._id.toString() } });
  }
  res.json({ success: true, business });
});

const listOffers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.cityId) filter.city = req.query.cityId;
  if (req.query.status === 'live') Object.assign(filter, { status: 'approved', isActive: true, startsAt: { $lte: new Date() }, expiresAt: { $gte: new Date() } });
  else if (req.query.status === 'expired') filter.expiresAt = { $lt: new Date() };
  else if (req.query.status === 'featured') filter.isFeatured = true;
  else if (req.query.status) filter.status = req.query.status;
  res.json({ success: true, ...(await paginated({ model: Offer, filter, query: req.query, populate: ['business', 'owner', 'city', 'subscription'] })) });
});
const moderateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new ApiError(404, 'Offer not found', 'OFFER_NOT_FOUND');
  if (req.body.action === 'approve') { offer.status = 'approved'; offer.isActive = true; offer.moderationReason = ''; }
  if (req.body.action === 'reject') {
    if (!req.body.reason) throw new ApiError(422, 'Rejection reason is required', 'REJECTION_REASON_REQUIRED');
    offer.status = 'rejected'; offer.moderationReason = req.body.reason;
  }
  if (req.body.action === 'suspend') { offer.status = 'suspended'; offer.moderationReason = req.body.reason || ''; }
  if (req.body.action === 'restore') { offer.status = 'approved'; offer.isActive = true; offer.moderationReason = ''; }
  if (req.body.action === 'feature') {
    if (!req.body.featuredUntil || new Date(req.body.featuredUntil) <= new Date()) throw new ApiError(422, 'A future featuredUntil is required', 'FEATURE_DATE_REQUIRED');
    offer.isFeatured = true; offer.featuredUntil = req.body.featuredUntil; offer.priorityRank = req.body.priorityRank || 1;
  }
  if (req.body.action === 'unfeature') { offer.isFeatured = false; offer.featuredUntil = null; offer.priorityRank = 0; }
  offer.moderatedBy = req.admin._id; offer.moderatedAt = new Date();
  await offer.save();
  if (req.body.action === 'approve' || req.body.action === 'restore') {
    notifyUser({ userId: offer.owner, type: 'offer_approved', title: req.body.action === 'restore' ? 'Offer restored' : 'Offer approved', body: `"${offer.title}" is now live.`, data: { offerId: offer._id.toString() } });
  } else if (req.body.action === 'reject') {
    notifyUser({ userId: offer.owner, type: 'offer_rejected', title: 'Offer rejected', body: offer.moderationReason, data: { offerId: offer._id.toString() } });
  }
  res.json({ success: true, offer });
});

const listOfferTemplates = asyncHandler(async (_req, res) => {
  const templates = await OfferTemplate.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, data: templates });
});
const createOfferTemplate = asyncHandler(async (req, res) => {
  const duplicate = await OfferTemplate.exists({ slug: req.body.slug });
  if (duplicate) throw new ApiError(409, 'A template with this slug already exists', 'TEMPLATE_SLUG_EXISTS');
  const template = await OfferTemplate.create({ ...req.body, createdBy: req.admin._id, updatedBy: req.admin._id });
  res.status(201).json({ success: true, template });
});
const updateOfferTemplate = asyncHandler(async (req, res) => {
  const template = await OfferTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, 'Offer template not found', 'TEMPLATE_NOT_FOUND');
  if (req.body.slug && req.body.slug !== template.slug && await OfferTemplate.exists({ slug: req.body.slug, _id: { $ne: template._id } })) {
    throw new ApiError(409, 'A template with this slug already exists', 'TEMPLATE_SLUG_EXISTS');
  }
  Object.assign(template, req.body);
  template.version = (template.version || 1) + 1;
  template.updatedBy = req.admin._id;
  await template.save();
  res.json({ success: true, template });
});
const deleteOfferTemplate = asyncHandler(async (req, res) => {
  const template = await OfferTemplate.findById(req.params.id);
  if (!template) throw new ApiError(404, 'Offer template not found', 'TEMPLATE_NOT_FOUND');
  template.isActive = false;
  template.updatedBy = req.admin._id;
  template.version = (template.version || 1) + 1;
  await template.save();
  res.json({ success: true, template });
});

const listTemplateStickers = asyncHandler(async (_req, res) => {
  const stickers = await TemplateSticker.find().sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, data: stickers });
});
const createTemplateSticker = asyncHandler(async (req, res) => {
  const duplicate = await TemplateSticker.exists({ slug: req.body.slug });
  if (duplicate) throw new ApiError(409, 'A sticker with this slug already exists', 'STICKER_SLUG_EXISTS');
  const sticker = await TemplateSticker.create({ ...req.body, createdBy: req.admin._id, updatedBy: req.admin._id });
  res.status(201).json({ success: true, sticker });
});
const updateTemplateSticker = asyncHandler(async (req, res) => {
  const sticker = await TemplateSticker.findById(req.params.id);
  if (!sticker) throw new ApiError(404, 'Sticker not found', 'STICKER_NOT_FOUND');
  if (req.body.slug && req.body.slug !== sticker.slug && await TemplateSticker.exists({ slug: req.body.slug, _id: { $ne: sticker._id } })) {
    throw new ApiError(409, 'A sticker with this slug already exists', 'STICKER_SLUG_EXISTS');
  }
  Object.assign(sticker, req.body);
  sticker.updatedBy = req.admin._id;
  await sticker.save();
  res.json({ success: true, sticker });
});
const deleteTemplateSticker = asyncHandler(async (req, res) => {
  const sticker = await TemplateSticker.findById(req.params.id);
  if (!sticker) throw new ApiError(404, 'Sticker not found', 'STICKER_NOT_FOUND');
  sticker.isActive = false;
  sticker.updatedBy = req.admin._id;
  await sticker.save();
  res.json({ success: true, sticker });
});

const uploadTemplateAsset = asyncHandler(async (req, res) => {
  const { dataUrl, name } = req.body || {};
  if (typeof dataUrl !== 'string') throw new ApiError(422, 'An image data URL is required', 'TEMPLATE_ASSET_DATA_REQUIRED');
  const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) throw new ApiError(422, 'Only PNG, JPEG, WEBP or GIF data URLs are supported', 'TEMPLATE_ASSET_FORMAT_INVALID');
  const data = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!data.length || data.length > 8_000_000) throw new ApiError(422, 'Image must be smaller than 8 MB', 'TEMPLATE_ASSET_TOO_LARGE');
  const asset = await TemplateAsset.create({ name: typeof name === 'string' ? name.slice(0, 180) : 'template-asset', mimeType: match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase(), data, size: data.length, createdBy: req.admin._id });
  const url = `${req.protocol}://${req.get('host')}/hyperlocal/template-assets/${asset._id}`;
  res.status(201).json({ success: true, asset: { _id: asset._id, name: asset.name, mimeType: asset.mimeType, size: asset.size, url } });
});

const getTemplateAsset = asyncHandler(async (req, res) => {
  const asset = await TemplateAsset.findById(req.params.id).select('mimeType data');
  if (!asset) throw new ApiError(404, 'Template asset not found', 'TEMPLATE_ASSET_NOT_FOUND');
  res.set('Content-Type', asset.mimeType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(asset.data);
});

const listPlans = asyncHandler(async (_req, res) => res.json({ success: true, data: await Plan.find().sort({ sortOrder: 1, price: 1 }) }));
const createPlan = asyncHandler(async (req, res) => { const plan = await Plan.create(req.body); res.status(201).json({ success: true, plan }); });
const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');
  res.json({ success: true, plan });
});

const listBookings = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.cityId) filter.city = req.query.cityId;
  if (req.query.status) filter.status = req.query.status;
  res.json({ success: true, ...(await paginated({ model: ServiceBooking, filter, query: req.query, populate: ['customer', 'city', 'category', 'worker'] })) });
});
const assignWorker = asyncHandler(async (req, res) => {
  const [booking, worker] = await Promise.all([ServiceBooking.findById(req.params.id), Worker.findById(req.body.workerId)]);
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (!worker || !worker.isActive || worker.verificationStatus !== 'verified' || worker.availability !== 'available' ||
      String(worker.city) !== String(booking.city) || !worker.categories.map(String).includes(String(booking.category))) {
    throw new ApiError(422, 'Worker must be verified, available, and match booking city/category', 'WORKER_ASSIGNMENT_INVALID');
  }
  booking.worker = worker._id; booking.status = 'assigned';
  booking.statusHistory.push({ status: 'assigned', at: new Date(), by: req.admin._id });
  await booking.save();
  worker.availability = 'busy'; await worker.save();
  notifyUser({ userId: booking.customer, type: 'worker_assigned', title: 'Worker assigned', body: `${worker.name} has been assigned to your booking.`, data: { bookingId: booking._id.toString() } });
  res.json({ success: true, booking });
});

const forwardBooking = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findById(req.params.id).populate('category', 'name').populate('city', 'name');
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (!['requested', 'confirmed'].includes(booking.status) || booking.worker) throw new ApiError(409, 'This booking is no longer open for provider responses', 'BOOKING_NOT_OPEN');
  const requestedIds = Array.isArray(req.body.workerIds) ? req.body.workerIds : [];
  // Offline providers can receive a request and accept it after switching Online.
  // Availability is checked again when the provider accepts the job.
  const workers = await Worker.find({ _id: { $in: requestedIds }, city: booking.city._id, categories: booking.category._id, isActive: true, verificationStatus: 'verified' }).select('_id name user serviceAreas availability');
  const locality = normalizeArea(booking.locality);
  // Older bookings may not have a locality because the area selector was added
  // later. Let admin route those legacy bookings by city/category and show the
  // missing-area warning in the dashboard; new bookings still validate locality.
  const eligible = workers.filter((worker) => !locality || (worker.serviceAreas || []).some((area) => normalizeArea(area) === locality));
  if (!eligible.length) throw new ApiError(422, 'Select at least one approved provider serving this area', 'NO_MATCHING_PROVIDERS');
  booking.status = 'confirmed';
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  booking.dispatchedProviders = eligible.map((worker) => ({ provider: worker._id, status: 'invited', sentAt: new Date(), expiresAt }));
  booking.statusHistory.push({ status: 'confirmed', at: new Date(), by: req.admin._id, note: `Forwarded to ${eligible.length} provider(s)` });
  await booking.save();
  await Promise.all(
    eligible.map((worker) =>
      notifyUser({
        userId: worker.user,
        type: 'provider_booking_request',
        title: 'New service request',
        body: `${booking.category.name} request in ${booking.locality || booking.city.name}. Respond within 1 hour.`,
        data: { bookingId: booking._id.toString() },
      })
    )
  );
  res.json({ success: true, booking });
});
const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  const allowed = {
    requested: ['confirmed', 'cancelled'], confirmed: ['cancelled'], assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed'], completed: [], cancelled: [],
  };
  if (!allowed[booking.status]?.includes(req.body.status)) throw new ApiError(409, 'Invalid booking status transition', 'BOOKING_STATUS_INVALID');
  booking.status = req.body.status;
  if (req.body.finalPrice !== undefined) booking.finalPrice = req.body.finalPrice;
  booking.statusHistory.push({ status: req.body.status, at: new Date(), by: req.admin._id, note: req.body.note || '' });
  await booking.save();
  if (booking.worker && ['completed', 'cancelled'].includes(booking.status)) {
    await Worker.updateOne({ _id: booking.worker }, { $set: { availability: 'available' }, ...(booking.status === 'completed' ? { $inc: { completedBookings: 1 } } : {}) });
  }
  if (booking.status === 'confirmed') {
    notifyUser({ userId: booking.customer, type: 'booking_confirmed', title: 'Booking confirmed', body: `Booking #${booking.bookingNumber || booking._id} has been confirmed.`, data: { bookingId: booking._id.toString() } });
  } else if (booking.status === 'completed') {
    notifyUser({ userId: booking.customer, type: 'booking_completed', title: 'Service completed', body: `Booking #${booking.bookingNumber || booking._id} is complete.`, data: { bookingId: booking._id.toString() } });
  }
  res.json({ success: true, booking });
});

const listPayments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  res.json({ success: true, ...(await paginated({ model: Payment, filter, query: req.query, populate: ['user', 'business', 'plan', 'booking'] })) });
});
const verifyPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, status: 'pending_verification' });
  if (!payment) throw new ApiError(404, 'Pending payment not found', 'PAYMENT_NOT_PENDING');
  if (!['subscription', 'service'].includes(payment.type)) throw new ApiError(422, 'Unsupported payment activation type', 'PAYMENT_TYPE_UNSUPPORTED');
  const duplicate = await Payment.exists({ providerPaymentId: req.body.providerPaymentId, _id: { $ne: payment._id } });
  if (duplicate) throw new ApiError(409, 'Provider payment reference already used', 'PAYMENT_REFERENCE_DUPLICATE');
  let subscription = null;
  if (payment.type === 'subscription') {
    if (!payment.planSnapshot || !payment.business) throw new ApiError(422, 'Subscription payment snapshot is missing', 'PAYMENT_SNAPSHOT_MISSING');
    const startsAt = new Date(); const endsAt = new Date(startsAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + payment.planSnapshot.durationDays);
    await Subscription.updateMany({ business: payment.business, status: 'active' }, { $set: { status: 'cancelled' } });
    subscription = await Subscription.create({
      business: payment.business, owner: payment.user, plan: payment.plan, payment: payment._id, status: 'active', startsAt, endsAt,
      quota: { offerPostingLimit: payment.planSnapshot.offerPostingLimit, maximumActiveOffers: payment.planSnapshot.maximumActiveOffers, featuredOfferAllowance: payment.planSnapshot.featuredOfferAllowance, imagesPerOffer: payment.planSnapshot.imagesPerOffer },
      usage: { offersPosted: 0, featuredOffersUsed: 0 },
    });
  } else {
    const booking = await ServiceBooking.findOne({ _id: payment.booking, customer: payment.user, status: 'completed' });
    if (!booking || Number(payment.amount) !== Number(booking.finalPrice ?? booking.priceEstimate)) throw new ApiError(422, 'Service payment does not match completed booking', 'SERVICE_PAYMENT_MISMATCH');
    booking.paymentStatus = 'paid';
    await booking.save();
  }
  payment.status = 'verified'; payment.providerPaymentId = req.body.providerPaymentId;
  payment.providerOrderId = req.body.providerOrderId || payment.providerOrderId; payment.verifiedAt = new Date(); payment.verifiedBy = req.admin._id;
  payment.metadata = { ...(payment.metadata || {}), verificationNote: req.body.note || '' };
  await payment.save();
  notifyUser({
    userId: payment.user,
    type: 'payment_update',
    title: 'Payment verified',
    body: payment.type === 'subscription' ? 'Your subscription plan is now active.' : 'Your service payment has been verified.',
    data: { paymentId: payment._id.toString(), type: payment.type },
  });
  res.json({ success: true, payment, subscription });
});
const refundPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, status: 'verified' });
  if (!payment) throw new ApiError(404, 'Verified payment not found', 'PAYMENT_NOT_VERIFIED');
  payment.status = 'refunded'; payment.failureReason = req.body.reason; await payment.save();
  if (payment.type === 'subscription') await Subscription.updateOne({ payment: payment._id, status: 'active' }, { $set: { status: 'cancelled' } });
  res.json({ success: true, payment });
});

module.exports = {
  listCities, createCity, updateCity, listWorkers, listProviderApplications, approveProviderApplication, rejectProviderApplication, createWorker, updateWorker,
  listServiceCategories, createServiceCategory, updateServiceCategory, listBusinesses, moderateBusiness,
  listOffers, moderateOffer, listOfferTemplates, createOfferTemplate, updateOfferTemplate, deleteOfferTemplate, listTemplateStickers, createTemplateSticker, updateTemplateSticker, deleteTemplateSticker, uploadTemplateAsset, getTemplateAsset, listPlans, createPlan, updatePlan, listBookings, assignWorker, forwardBooking, updateBookingStatus,
  listPayments, verifyPayment, refundPayment,
};
