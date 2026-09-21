const crypto = require('crypto');
const mongoose = require('mongoose');
const Plan = require('../models/Plan');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ServiceBooking = require('../models/ServiceBooking');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const razorpay = require('../services/razorpayService');
const settlement = require('../services/paymentSettlementService');
const { TTL_MS: CHECKOUT_TTL_MS, createCheckoutToken, verifyCheckoutToken } = require('../utils/checkoutToken');
const { renderCheckoutPage, renderResultPage } = require('../views/paymentPages');

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

  const orderId = `SUB-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const record = {
    orderId,
    user: req.user._id,
    business: business._id,
    type: 'subscription',
    plan: plan._id,
    // The amount always comes from the plan, never from the client.
    amount: plan.price,
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
  };

  // Pay online whenever Razorpay is configured and the plan costs at least the
  // gateway minimum (₹1). Otherwise keep the manual flow: order recorded, admin verifies.
  const amountPaise = razorpay.toPaise(plan.price);
  if (!razorpay.isConfigured() || amountPaise < razorpay.MIN_AMOUNT_PAISE) {
    const payment = await Payment.create({ ...record, provider: 'manual', status: 'pending_verification' });
    return res.status(201).json({
      success: true,
      payment,
      paymentInstructions: {
        mode: 'server_verified',
        message: 'Payment activation occurs only after secure server/admin verification.',
      },
    });
  }

  // The method the user picked in the app (UPI / card / netbanking). Checkout shows only this one.
  const method = req.body.method;
  // The app opens this path (on the same API host it already talks to) in the browser.
  const checkoutFor = (payment) => ({ path: `/payments/${payment._id}/razorpay-checkout?token=${createCheckoutToken(String(payment._id))}` });

  // Retrying (cancelled UPI, now choosing card) must not stack up duplicate unpaid
  // orders. Reuse the still-open order for this exact purchase and just record the
  // newly chosen method; Razorpay allows several payment attempts on one order.
  const reusable = await Payment.findOneAndUpdate(
    {
      user: req.user._id,
      business: business._id,
      plan: plan._id,
      type: 'subscription',
      provider: 'razorpay',
      status: 'created',
      amount: plan.price,
      createdAt: { $gte: new Date(Date.now() - CHECKOUT_TTL_MS) },
    },
    method ? { $set: { 'metadata.preferredMethod': method } } : { $unset: { 'metadata.preferredMethod': '' } },
    { new: true, sort: { createdAt: -1 } }
  );
  if (reusable) return res.json({ success: true, payment: reusable, checkout: checkoutFor(reusable) });

  const order = await razorpay.createOrder({
    amountPaise,
    receipt: orderId,
    notes: { planCode: plan.code, businessId: String(business._id), userId: String(req.user._id) },
  });
  if (typeof order?.id !== 'string') throw new ApiError(502, 'The payment gateway returned an invalid order', 'RAZORPAY_RESPONSE_INVALID');
  const payment = await Payment.create({
    ...record,
    provider: 'razorpay',
    providerOrderId: order.id,
    status: 'created',
    metadata: method ? { preferredMethod: method } : {},
  });

  res.status(201).json({ success: true, payment, checkout: checkoutFor(payment) });
});

const sendResultPage = (res, status, { tone, title, message, paymentId }) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res
    .status(status)
    // Helmet's default policy is API-oriented; this page only needs its one inline script.
    .set('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`)
    .set('Cache-Control', 'no-store')
    .type('html')
    .send(renderResultPage({ tone, title, message, paymentId, nonce }));
};

// Opened in the phone's browser by the app. Authorised by the signed link token
// (the browser has no app login), not by a bearer token.
const razorpayCheckoutPage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id) || !verifyCheckoutToken(id, req.query.token)) {
    return sendResultPage(res, 403, { tone: 'failed', title: 'Payment link expired', message: 'This payment link is no longer valid. Go back to the app and choose your plan again.' });
  }
  const payment = await Payment.findOne({ _id: id, provider: 'razorpay', status: { $in: ['created', 'pending_verification'] } });
  if (!payment) {
    return sendResultPage(res, 404, { tone: 'failed', title: 'Nothing to pay', message: 'This payment was already completed or could not be found. Go back to the app to check your plan.', paymentId: id });
  }
  const user = await User.findById(payment.user).select('name phone email');

  // Razorpay Checkout is third-party script plus popups/iframes that talk back to
  // this page, and that cannot be verified against a strict policy here. The page
  // renders only server-controlled, escaped values, so drop Helmet's CSP and the
  // same-origin opener policy (which severs Checkout's popup channel) for this route only.
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.set('Cache-Control', 'no-store').type('html').send(
    renderCheckoutPage({
      keyId: env.razorpayKeyId,
      orderId: payment.providerOrderId,
      amountPaise: razorpay.toPaise(payment.amount),
      amountLabel: Number(payment.amount).toLocaleString('en-IN'),
      planName: payment.planSnapshot?.name || 'Subscription plan',
      description: `${payment.planSnapshot?.name || 'Plan'} · ${payment.orderId}`,
      prefill: { name: user?.name, contact: user?.phone, email: user?.email },
      callbackPath: `/payments/${payment._id}/razorpay-callback`,
      method: payment.metadata?.preferredMethod,
    })
  );
});

// Razorpay Checkout (redirect mode) POSTs here from the user's browser, so there is
// no app login. Trust comes from the HMAC signature only Razorpay can produce, and
// the payment is then re-confirmed with Razorpay before anything is activated.
const razorpayCallback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const payment = mongoose.isValidObjectId(id) ? await Payment.findOne({ _id: id, provider: 'razorpay' }) : null;
  if (!payment) {
    return sendResultPage(res, 404, { tone: 'failed', title: 'Payment not found', message: 'We could not find this payment. Please start again from the app.' });
  }

  if (!body.razorpay_signature) {
    // Cancelled, or failed at the bank. The order stays payable, so nothing is changed.
    const reason = typeof body.error?.description === 'string' ? body.error.description.slice(0, 200) : '';
    return sendResultPage(res, 200, {
      tone: 'failed',
      title: 'Payment not completed',
      message: `${reason || 'The payment was cancelled or did not go through.'} If any amount was deducted, your bank usually refunds it automatically. Go back to the app to try again.`,
      paymentId: id,
    });
  }

  const { razorpay_order_id: orderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: signature } = body;
  if (orderId !== payment.providerOrderId || !razorpay.verifyPaymentSignature({ orderId, paymentId: razorpayPaymentId, signature })) {
    console.error(`[razorpay] callback signature rejected for payment ${id}`);
    return sendResultPage(res, 400, {
      tone: 'failed',
      title: 'Payment could not be verified',
      message: `We could not verify this payment. If money was deducted, contact support with order ${payment.orderId}.`,
      paymentId: id,
    });
  }

  try {
    const { settled } = await settlement.settleRazorpayPayment(payment, { razorpayPaymentId });
    if (settled) {
      return sendResultPage(res, 200, { tone: 'success', title: 'Payment successful', message: 'Your plan is now active. Return to the app to start posting offers.', paymentId: id });
    }
  } catch (error) {
    console.error(`[razorpay] settling payment ${id} failed: ${error.code || error.message}`);
  }
  // Signature is valid but we could not finish confirming right now. The app's
  // status check retries this, so the plan still activates.
  return sendResultPage(res, 200, {
    tone: 'pending',
    title: 'Confirming your payment',
    message: `We received your payment for order ${payment.orderId} and are confirming it. Return to the app; your plan activates in a moment.`,
    paymentId: id,
  });
});

// The app calls this when it comes back from the browser (or when the user
// re-opens a pending payment). Asks Razorpay directly, so it also recovers
// payments whose browser callback never arrived.
const syncPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, user: req.user._id });
  if (!payment) throw new ApiError(404, 'Payment not found', 'PAYMENT_NOT_FOUND');
  if (payment.provider !== 'razorpay') return res.json({ success: true, payment, activated: false });
  const result = await settlement.settleRazorpayPayment(payment);
  res.json({ success: true, payment: result.payment, subscription: result.subscription ?? null, activated: result.settled });
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

module.exports = {
  listPlans,
  createSubscriptionOrder,
  createServiceOrder,
  listMyPayments,
  listMySubscriptions,
  rejectClientVerification,
  razorpayCheckoutPage,
  razorpayCallback,
  syncPayment,
};
