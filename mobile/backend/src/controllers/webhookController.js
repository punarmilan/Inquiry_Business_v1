const Payment = require('../models/Payment');
const razorpay = require('../services/razorpayService');
const settlement = require('../services/paymentSettlementService');
const asyncHandler = require('../utils/asyncHandler');

// Razorpay POSTs here for events on ANY order in this account (not scoped to a
// payment id), so the payment is looked up by the gateway's own order id. Must
// be mounted with a raw-body parser BEFORE the app's global express.json(), or
// the signature (computed over the exact request bytes) will never verify.
const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body;
  if (!razorpay.verifyWebhookSignature({ rawBody, signature })) {
    console.error('[razorpay webhook] signature rejected');
    return res.status(400).json({ success: false, error: { code: 'WEBHOOK_SIGNATURE_INVALID', message: 'Invalid signature' } });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, error: { code: 'WEBHOOK_PAYLOAD_INVALID', message: 'Invalid JSON' } });
  }

  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;
  const orderId = paymentEntity?.order_id || orderEntity?.id;
  if (typeof orderId !== 'string') return res.status(200).json({ success: true, ignored: true });

  const payment = await Payment.findOne({ providerOrderId: orderId, provider: 'razorpay' });
  if (!payment) {
    // A stray/foreign event (different Razorpay product on the same account, a
    // Dashboard test ping, ...). Ack so Razorpay stops retrying — nothing here can ever match.
    console.warn(`[razorpay webhook] no local payment for order ${orderId} (event ${event.event})`);
    return res.status(200).json({ success: true, ignored: true });
  }

  const io = req.app.get('io');
  try {
    // Idempotency is structural, not event-id based: settleRazorpayPayment's
    // atomic findOneAndUpdate claim means a redelivered event just finds the
    // payment already 'verified' and no-ops (no duplicate notification, no
    // duplicate booking/subscription activation).
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      await settlement.settleRazorpayPayment(payment, { razorpayPaymentId: paymentEntity?.id, io });
    } else if (event.event === 'payment.failed') {
      await settlement.recordFailedPayment(payment, { reason: paymentEntity?.error_description || 'Payment failed' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`[razorpay webhook] handling ${event.event} for payment ${payment._id} failed: ${error.message}`);
    // 5xx tells Razorpay to retry the delivery later.
    return res.status(500).json({ success: false, error: { code: 'WEBHOOK_HANDLER_ERROR', message: 'Could not process webhook' } });
  }
});

module.exports = { razorpayWebhook };
