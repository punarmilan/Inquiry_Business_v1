const crypto = require('crypto');
const Plan = require('../models/Plan');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ServiceBooking = require('../models/ServiceBooking');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const listPlans = asyncHandler(async (_req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1, price: 1 }).select('-__v');
  res.json({ success: true, data: plans });
});

const createSubscriptionOrder = asyncHandler(async (req, res) => {
  const [plan, business] = await Promise.all([
    Plan.findOne({ _id: req.body.planId, isActive: true }),
    Business.findOne({ _id: req.body.businessId, owner: req.user._id, isActive: true }),
  ]);
  if (!plan) throw new ApiError(404, 'Plan not found', 'PLAN_NOT_FOUND');
  if (!business) throw new ApiError(404, 'Business not found', 'BUSINESS_NOT_FOUND');

  const payment = await Payment.create({
    orderId: `SUB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user: req.user._id,
    business: business._id,
    type: 'subscription',
    plan: plan._id,
    amount: plan.price,
    provider: 'manual',
    status: 'pending_verification',
    planSnapshot: {
      name: plan.name,
      code: plan.code,
      price: plan.price,
      durationDays: plan.durationDays,
      offerPostingLimit: plan.offerPostingLimit,
      maximumActiveOffers: plan.maximumActiveOffers,
      featuredOfferAllowance: plan.featuredOfferAllowance,
      imagesPerOffer: plan.imagesPerOffer,
    },
  });

  res.status(201).json({
    success: true,
    payment,
    paymentInstructions: {
      mode: 'server_verified',
      message: 'Payment activation occurs only after secure server/admin verification.',
    },
  });
});

const createServiceOrder = asyncHandler(async (req, res) => {
  const booking = await ServiceBooking.findOne({ _id: req.body.bookingId, customer: req.user._id, status: 'completed' });
  if (!booking) throw new ApiError(404, 'Completed booking not found', 'COMPLETED_BOOKING_NOT_FOUND');
  if (!booking.rating?.ratedAt) throw new ApiError(409, 'Please rate the completed service before continuing', 'BOOKING_RATING_REQUIRED');
  if (booking.paymentStatus === 'paid') throw new ApiError(409, 'This booking is already paid', 'BOOKING_ALREADY_PAID');
  const existing = await Payment.findOne({ booking: booking._id, type: 'service', status: { $in: ['pending_verification', 'verified'] } });
  if (existing) return res.json({ success: true, payment: existing });
  const payment = await Payment.create({
    orderId: `SVC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    user: req.user._id,
    booking: booking._id,
    type: 'service',
    amount: booking.finalPrice ?? booking.priceEstimate,
    provider: 'manual',
    status: 'pending_verification',
  });
  booking.paymentStatus = 'pending';
  await booking.save();
  res.status(201).json({ success: true, payment });
});

const listMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .populate('plan', 'name code')
    .populate('business', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

const listMySubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();
  await Subscription.updateMany({ owner: req.user._id, status: 'active', endsAt: { $lt: now } }, { $set: { status: 'expired' } });
  const subscriptions = await Subscription.find({ owner: req.user._id })
    .populate('plan', 'name code price analyticsAccess priorityRanking')
    .populate('business', 'name logoUrl')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: subscriptions });
});

const rejectClientVerification = asyncHandler(async (_req, _res) => {
  throw new ApiError(403, 'Payment success must be verified server-side', 'CLIENT_PAYMENT_VERIFICATION_FORBIDDEN');
});

module.exports = { listPlans, createSubscriptionOrder, createServiceOrder, listMyPayments, listMySubscriptions, rejectClientVerification };
