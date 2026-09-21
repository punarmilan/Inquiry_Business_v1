const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');
const razorpayService = require('./razorpayService');
const { notifyUser } = require('./notificationService');

const PAYABLE_STATUSES = ['created', 'pending_verification'];

/**
 * Gives the paid plan to the business. Safe to call any number of times: a
 * payment owns at most one subscription (unique index on `payment`), so a
 * retry after a crash between "payment verified" and "subscription created"
 * simply finishes the job.
 */
const ensureSubscription = async (payment) => {
  if (payment.type !== 'subscription') return null;
  const existing = await Subscription.findOne({ payment: payment._id });
  if (existing) return existing;

  const snapshot = payment.planSnapshot;
  if (!snapshot || !payment.business) throw new ApiError(422, 'Subscription payment snapshot is missing', 'PAYMENT_SNAPSHOT_MISSING');
  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  endsAt.setUTCDate(endsAt.getUTCDate() + snapshot.durationDays);

  // A new plan replaces the business's current one (same rule as admin verification),
  // but never the subscription this payment itself already created.
  await Subscription.updateMany(
    { business: payment.business, status: 'active', payment: { $ne: payment._id } },
    { $set: { status: 'cancelled' } }
  );
  try {
    return await Subscription.create({
      business: payment.business,
      owner: payment.user,
      plan: payment.plan,
      payment: payment._id,
      status: 'active',
      startsAt,
      endsAt,
      quota: {
        offerPostingLimit: snapshot.offerPostingLimit,
        maximumActiveOffers: snapshot.maximumActiveOffers,
        featuredOfferAllowance: snapshot.featuredOfferAllowance,
        imagesPerOffer: snapshot.imagesPerOffer,
      },
      usage: { offersPosted: 0, featuredOffersUsed: 0 },
    });
  } catch (error) {
    // A concurrent settle created it first.
    if (error.code === 11000) return Subscription.findOne({ payment: payment._id });
    throw error;
  }
};

// Razorpay only guarantees money for a *captured* payment. With auto-capture
// this is already true; otherwise capture it now. Auto-capture can also win the
// race between our fetch and the capture call, which is fine.
const ensureCaptured = async (gatewayPayment, amountPaise, razorpay) => {
  if (gatewayPayment.status === 'captured') return;
  try {
    await razorpay.capturePayment(gatewayPayment.id, amountPaise);
  } catch (error) {
    const latest = await razorpay.fetchPayment(gatewayPayment.id);
    if (latest.status !== 'captured') throw error;
  }
};

/**
 * Asks Razorpay (server to server, with our secret) whether this order has been
 * paid, and only then marks the payment verified and activates the plan.
 * Nothing the app or the browser says is trusted on its own.
 *
 * Pass `razorpayPaymentId` when the checkout callback already named the payment
 * (its signature must have been verified by the caller); otherwise every payment
 * attempt on the order is inspected.
 */
const settleRazorpayPayment = async (payment, { razorpayPaymentId, razorpay = razorpayService } = {}) => {
  if (payment.provider !== 'razorpay' || !payment.providerOrderId) {
    throw new ApiError(409, 'This is not an online payment', 'PAYMENT_NOT_ONLINE');
  }
  if (payment.status === 'verified') {
    return { payment, subscription: await ensureSubscription(payment), settled: true };
  }
  if (!PAYABLE_STATUSES.includes(payment.status)) return { payment, settled: false };

  const expectedPaise = razorpay.toPaise(payment.amount);
  const attempts = razorpayPaymentId
    ? [await razorpay.fetchPayment(razorpayPaymentId)]
    : (await razorpay.fetchOrderPayments(payment.providerOrderId)).items ?? [];
  const paid = attempts.find(
    (attempt) =>
      attempt.order_id === payment.providerOrderId &&
      attempt.currency === 'INR' &&
      attempt.amount === expectedPaise &&
      ['authorized', 'captured'].includes(attempt.status)
  );
  if (!paid) return { payment, settled: false };
  await ensureCaptured(paid, expectedPaise, razorpay);

  // Atomic claim: only one of callback / app sync wins and announces the payment.
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: PAYABLE_STATUSES } },
    { $set: { status: 'verified', providerPaymentId: paid.id, verifiedAt: new Date(), failureReason: '' } },
    { new: true }
  );
  const settled = claimed || (await Payment.findById(payment._id));
  const subscription = await ensureSubscription(settled);
  if (claimed) {
    notifyUser({
      userId: settled.user,
      type: 'payment_update',
      title: 'Payment successful',
      body: 'Your subscription plan is now active.',
      data: { paymentId: String(settled._id), type: settled.type },
    }).catch(() => {});
  }
  return { payment: settled, subscription, settled: settled.status === 'verified' };
};

module.exports = { ensureSubscription, settleRazorpayPayment };
