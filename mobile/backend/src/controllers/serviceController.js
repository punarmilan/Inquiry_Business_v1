const crypto = require('crypto');
const City = require('../models/City');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceBooking = require('../models/ServiceBooking');
const Worker = require('../models/Worker');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const chatService = require('../services/chatService');
const { notifyUser } = require('../services/notificationService');

const supportedServiceCities = () =>
  City.find({ isActive: true, servicesEnabled: true }).select('name state slug').sort({ name: 1 });

const listCategories = asyncHandler(async (req, res) => {
  const city = await City.findById(req.query.cityId).select('name state slug localities isActive servicesEnabled');
  if (!city || !city.isActive || !city.servicesEnabled) {
    return res.json({
      success: true,
      data: [],
      comingSoon: true,
      message: "We're coming to your city soon.",
      availableCities: await supportedServiceCities(),
    });
  }
  const categories = await ServiceCategory.find({
    isActive: true,
    $or: [{ cityAvailability: { $size: 0 } }, { cityAvailability: city._id }],
  }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: categories, city, availableAreas: city.localities || [], comingSoon: false });
});

const listProviders = asyncHandler(async (req, res) => {
  const [city, category] = await Promise.all([
    City.findOne({ _id: req.query.cityId, isActive: true, servicesEnabled: true }).select('name state slug localities'),
    req.query.categoryId ? ServiceCategory.findOne({ _id: req.query.categoryId, isActive: true }).select('name') : null,
  ]);
  if (!city) throw new ApiError(422, 'Services are not available in this city yet', 'SERVICES_CITY_UNAVAILABLE');
  if (req.query.categoryId && !category) throw new ApiError(404, 'Service category not found', 'SERVICE_CATEGORY_NOT_FOUND');

  const locality = String(req.query.locality || '').trim();
  const workerFilter = {
    city: city._id,
    isActive: true,
    verificationStatus: 'verified',
    availability: 'available',
  };
  if (category) workerFilter.categories = category._id;
  const workers = await Worker.find(workerFilter)
    .select('_id name photoUrl categories city serviceAreas ratingAverage ratingCount completedBookings availability experienceYears')
    .populate('categories', 'name icon basePrice priceUnit')
    .sort({ availability: 1, ratingAverage: -1, completedBookings: -1, name: 1 });

  const matchesLocality = (worker) => !locality || (worker.serviceAreas || []).some((area) => area.trim().toLocaleLowerCase('en-IN') === locality.toLocaleLowerCase('en-IN'));
  res.json({
    success: true,
    data: workers.filter(matchesLocality),
    city,
    category: category || null,
    locality,
  });
});

const createBooking = asyncHandler(async (req, res) => {
  const [city, category] = await Promise.all([
    City.findOne({ _id: req.body.cityId, isActive: true, servicesEnabled: true }),
    ServiceCategory.findOne({ _id: req.body.categoryId, isActive: true }),
  ]);
  if (!city) throw new ApiError(422, 'Services are not available in this city yet', 'SERVICES_CITY_UNAVAILABLE');
  if (!category) throw new ApiError(404, 'Service category not found', 'SERVICE_CATEGORY_NOT_FOUND');
  if (category.cityAvailability.length && !category.cityAvailability.some((id) => String(id) === String(city._id))) {
    throw new ApiError(422, 'This service is not available in the selected city', 'SERVICE_CATEGORY_CITY_UNAVAILABLE');
  }
  const requestedLocality = String(req.body.locality || '').trim();
  if (city.localities.length && (!requestedLocality || !city.localities.some((area) => area.toLowerCase() === requestedLocality.toLowerCase()))) {
    throw new ApiError(422, 'Select an area where services are available', 'SERVICE_AREA_UNAVAILABLE');
  }
  let selectedWorker = null;
  if (req.body.workerId) {
    selectedWorker = await Worker.findOne({
      _id: req.body.workerId,
      city: city._id,
      categories: category._id,
      isActive: true,
      verificationStatus: 'verified',
      availability: 'available',
    });
    if (!selectedWorker) throw new ApiError(422, 'Selected provider is not available for this service area', 'PROVIDER_SELECTION_INVALID');
    if (requestedLocality && !(selectedWorker.serviceAreas || []).some((area) => area.toLowerCase() === requestedLocality.toLowerCase())) {
      throw new ApiError(422, 'Selected provider does not serve this area', 'PROVIDER_AREA_MISMATCH');
    }
  }
  const scheduledFor = req.body.scheduleType === 'now' ? new Date() : new Date(req.body.scheduledFor);
  if (req.body.scheduleType === 'later' && scheduledFor <= new Date()) {
    throw new ApiError(422, 'Scheduled time must be in the future', 'INVALID_SCHEDULE_TIME');
  }
  const booking = await ServiceBooking.create({
    bookingNumber: `AW-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    customer: req.user._id,
    city: city._id,
    category: category._id,
    address: req.body.address,
    locality: requestedLocality,
    location: { type: 'Point', coordinates: [Number(req.body.longitude), Number(req.body.latitude)] },
    scheduleType: req.body.scheduleType,
    scheduledFor,
    problemDescription: req.body.problemDescription,
    priceEstimate: category.basePrice,
    statusHistory: [{ status: 'requested', by: req.user._id, note: selectedWorker ? `Direct request sent to ${selectedWorker.name}` : '' }],
    dispatchedProviders: selectedWorker ? [{ provider: selectedWorker._id, status: 'invited', sentAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }] : [],
  });
  if (selectedWorker) {
    const io = req.app.get('io');
    await notifyUser({
      io,
      userId: selectedWorker.user,
      type: 'provider_booking_request',
      title: 'New direct service request',
      body: `${category.name} request in ${requestedLocality || city.name}. Respond within 1 hour.`,
      data: { bookingId: booking._id.toString() },
    });
  }
  res.status(201).json({ success: true, booking: await booking.populate(['city', 'category']) });
});

const listBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { customer: req.user._id };
  const [bookings, total] = await Promise.all([
    ServiceBooking.find(filter)
      .populate('city', 'name state')
      .populate('category', 'name icon imageUrl priceUnit')
      .populate('worker', 'name photoUrl phone ratingAverage availability')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ServiceBooking.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data: bookings, total, page, limit }) });
});

const getBooking = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findOne({ _id: req.params.id, customer: req.user._id })
    .populate('city', 'name state')
    .populate('category', 'name icon imageUrl priceUnit')
    .populate('worker', 'name photoUrl phone ratingAverage availability');
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  res.json({ success: true, booking });
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findOne({ _id: req.params.id, customer: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (!['requested', 'confirmed', 'assigned'].includes(booking.status)) {
    throw new ApiError(409, 'This booking can no longer be cancelled', 'BOOKING_CANCELLATION_NOT_ALLOWED');
  }
  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason;
  booking.statusHistory.push({ status: 'cancelled', by: req.user._id, note: req.body.reason });
  await booking.save();
  res.json({ success: true, booking });
});

const rateBooking = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findOne({ _id: req.params.id, customer: req.user._id });
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.status !== 'completed') throw new ApiError(409, 'Only completed services can be rated', 'BOOKING_NOT_COMPLETED');
  if (booking.rating?.ratedAt) throw new ApiError(409, 'This service has already been rated', 'BOOKING_ALREADY_RATED');
  booking.rating = { stars: req.body.stars, review: req.body.review || '', ratedAt: new Date() };
  await booking.save();
  if (booking.worker) {
    const worker = await Worker.findById(booking.worker);
    if (worker) {
      const total = worker.ratingAverage * worker.ratingCount + req.body.stars;
      worker.ratingCount += 1;
      worker.ratingAverage = Number((total / worker.ratingCount).toFixed(2));
      await worker.save();
    }
  }
  res.json({ success: true, booking });
});

const openBookingChat = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findOne({ _id: req.params.id, customer: req.user._id }).populate('worker');
  if (!booking) throw new ApiError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (!booking.worker?.user || !['assigned', 'in_progress', 'completed'].includes(booking.status)) {
    throw new ApiError(409, 'Chat becomes available after a worker is assigned', 'BOOKING_CHAT_UNAVAILABLE');
  }
  const chat = await chatService.findOrCreateBookingChat({
    bookingId: booking._id,
    customerId: booking.customer,
    workerUserId: booking.worker.user,
  });
  res.json({ success: true, chat });
});

const getProvider = async (req) => {
  if (req.user.role !== 'worker') throw new ApiError(403, 'Provider access required', 'PROVIDER_ACCESS_REQUIRED');
  const provider = await Worker.findOne({ user: req.user._id }).populate('city', 'name state localities').populate('categories', 'name icon');
  if (!provider || !provider.isActive || provider.verificationStatus !== 'verified') {
    throw new ApiError(403, 'Provider account is not active or approved', 'PROVIDER_NOT_APPROVED');
  }
  return provider;
};

const listProviderBookings = asyncHandler(async (req, res) => {
  const provider = await getProvider(req);
  const { page, limit, skip } = getPagination(req.query);
  const filter = { 'dispatchedProviders.provider': provider._id };
  const [bookings, total] = await Promise.all([
    ServiceBooking.find(filter).populate('customer', 'name phone photoUrl').populate('city', 'name state').populate('category', 'name icon imageUrl priceUnit').populate('worker', 'name phone').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ServiceBooking.countDocuments(filter),
  ]);
  res.json({ success: true, ...paginatedResponse({ data: bookings, total, page, limit }), provider });
});

const respondToProviderBooking = asyncHandler(async (req, res) => {
  const provider = await getProvider(req);
  const response = req.body.response;
  const booking = await ServiceBooking.findOne({ _id: req.params.id, 'dispatchedProviders': { $elemMatch: { provider: provider._id, status: 'invited' } } });
  if (!booking) throw new ApiError(404, 'Provider request not found or already answered', 'PROVIDER_REQUEST_NOT_FOUND');
  const dispatch = booking.dispatchedProviders.find((item) => String(item.provider) === String(provider._id));
  if (dispatch.expiresAt && dispatch.expiresAt.getTime() <= Date.now()) {
    dispatch.status = 'expired'; dispatch.respondedAt = new Date(); await booking.save();
    throw new ApiError(409, 'This provider request expired after 1 hour', 'PROVIDER_REQUEST_EXPIRED');
  }
  if (response === 'rejected') {
    dispatch.status = 'rejected'; dispatch.respondedAt = new Date(); dispatch.note = req.body.note || '';
    await booking.save();
    res.json({ success: true, booking });
    return;
  }
  if (provider.availability !== 'available') throw new ApiError(409, 'Set your availability to available before accepting', 'PROVIDER_NOT_AVAILABLE');
  const claimed = await ServiceBooking.findOneAndUpdate(
    { _id: booking._id, worker: null, status: { $in: ['requested', 'confirmed'] }, 'dispatchedProviders': { $elemMatch: { provider: provider._id, status: 'invited' } } },
    { $set: { worker: provider._id, status: 'assigned', 'dispatchedProviders.$[accepted].status': 'accepted', 'dispatchedProviders.$[accepted].respondedAt': new Date(), 'dispatchedProviders.$[others].status': 'already_accepted', 'dispatchedProviders.$[others].respondedAt': new Date() }, $push: { statusHistory: { status: 'assigned', at: new Date(), by: req.user._id, note: 'Accepted by provider' } } },
    { new: true, arrayFilters: [{ 'accepted.provider': provider._id, 'accepted.status': 'invited', 'accepted.expiresAt': { $gt: new Date() } }, { 'others.status': 'invited', 'others.provider': { $ne: provider._id } }] }
  );
  if (!claimed) throw new ApiError(409, 'Already accepted by another provider', 'BOOKING_ALREADY_ACCEPTED');
  provider.availability = 'busy'; await provider.save();
  const io = req.app.get('io');
  await notifyUser({ io, userId: claimed.customer, type: 'worker_assigned', title: 'Provider assigned', body: `${provider.name} accepted your service request.`, data: { bookingId: claimed._id.toString() } });
  res.json({ success: true, booking: await claimed.populate(['city', 'category', 'customer', 'worker']) });
});

const updateProviderBookingStatus = asyncHandler(async (req, res) => {
  const provider = await getProvider(req);
  const booking = await ServiceBooking.findOne({ _id: req.params.id, worker: provider._id });
  if (!booking) throw new ApiError(404, 'Assigned booking not found', 'BOOKING_NOT_FOUND');
  const allowed = { assigned: ['in_progress', 'cancelled'], in_progress: ['completed'] };
  if (!allowed[booking.status]?.includes(req.body.status)) throw new ApiError(409, 'Invalid provider status transition', 'BOOKING_STATUS_INVALID');
  booking.status = req.body.status;
  if (req.body.finalPrice !== undefined) booking.finalPrice = req.body.finalPrice;
  booking.statusHistory.push({ status: req.body.status, at: new Date(), by: req.user._id, note: req.body.note || '' });
  await booking.save();
  if (['completed', 'cancelled'].includes(booking.status)) {
    provider.availability = 'available';
    if (booking.status === 'completed') provider.completedBookings += 1;
    await provider.save();
  }
  const io = req.app.get('io');
  await notifyUser({ io, userId: booking.customer, type: booking.status === 'completed' ? 'booking_completed' : 'provider_booking_status', title: booking.status === 'completed' ? 'Service completed' : 'Service update', body: `Booking #${booking.bookingNumber} is now ${booking.status.replace('_', ' ')}.`, data: { bookingId: booking._id.toString() } });
  res.json({ success: true, booking });
});

const updateProviderAvailability = asyncHandler(async (req, res) => {
  const provider = await getProvider(req);
  if (provider.availability === 'busy' && req.body.availability === 'available') {
    throw new ApiError(409, 'Finish the active booking before going online again', 'PROVIDER_HAS_ACTIVE_BOOKING');
  }
  provider.availability = req.body.availability;
  await provider.save();
  res.json({ success: true, provider });
});

const openProviderBookingChat = asyncHandler(async (req, res) => {
  const provider = await getProvider(req);
  const booking = await ServiceBooking.findOne({ _id: req.params.id, worker: provider._id }).populate('customer', 'name phone photoUrl');
  if (!booking || !['assigned', 'in_progress', 'completed'].includes(booking.status)) {
    throw new ApiError(409, 'Chat becomes available after you accept this booking', 'BOOKING_CHAT_UNAVAILABLE');
  }
  const chat = await chatService.findOrCreateBookingChat({ bookingId: booking._id, customerId: booking.customer._id, workerUserId: provider.user });
  res.json({ success: true, chat, customer: booking.customer });
});

const getBookingLocations = asyncHandler(async (req, res) => {
  const locationService = require('../services/locationService');
  await locationService.assertCanShareBookingLocation(req.params.id, req.user._id);
  const shares = await locationService.getSharesForBooking(req.params.id);
  res.json({
    success: true,
    data: shares.map((share) => ({
      userId: share.user.toString(),
      latitude: share.latitude,
      longitude: share.longitude,
      accuracy: share.accuracy,
      heading: share.heading,
      speed: share.speed,
      updatedAt: share.updatedAt,
    })),
  });
});

module.exports = { listCategories, listProviders, createBooking, listBookings, getBooking, cancelBooking, rateBooking, openBookingChat, listProviderBookings, respondToProviderBooking, updateProviderBookingStatus, updateProviderAvailability, openProviderBookingChat, getBookingLocations };
