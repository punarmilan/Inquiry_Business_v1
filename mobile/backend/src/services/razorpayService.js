const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const API_BASE = 'https://api.razorpay.com/v1';
const REQUEST_TIMEOUT_MS = 20_000;
// Razorpay rejects orders below ₹1.
const MIN_AMOUNT_PAISE = 100;
// Payment methods the app offers before opening checkout. These are also
// Razorpay's own instrument names, used to show only the chosen method.
const PAYMENT_METHODS = ['upi', 'card', 'netbanking'];

const defaultConfig = () => ({ keyId: env.razorpayKeyId, keySecret: env.razorpayKeySecret });

const isConfigured = (config = defaultConfig()) => Boolean(config.keyId && config.keySecret);

// Razorpay works in integer paise. Plan prices are rupees (possibly with decimals).
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const request = async (path, { method = 'GET', body, config = defaultConfig(), fetchImpl = globalThis.fetch } = {}) => {
  if (!isConfigured(config)) throw new ApiError(503, 'Online payments are not configured', 'RAZORPAY_NOT_CONFIGURED');
  if (typeof fetchImpl !== 'function') throw new ApiError(503, 'Online payments are unavailable', 'RAZORPAY_UNAVAILABLE');

  let response;
  try {
    response = await fetchImpl(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the payment gateway', 'RAZORPAY_UNAVAILABLE');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The error handler does not log; keep the gateway's reason (never the credentials) for diagnosis.
    console.error(`[razorpay] ${method} ${path} failed (${response.status}): ${payload?.error?.description || 'no description'}`);
    throw new ApiError(502, 'The payment gateway rejected the request', 'RAZORPAY_REQUEST_FAILED');
  }
  return payload;
};

const createOrder = ({ amountPaise, receipt, notes }, options) =>
  request('/orders', { ...options, method: 'POST', body: { amount: amountPaise, currency: 'INR', receipt, notes } });

const fetchOrderPayments = (orderId, options) => request(`/orders/${encodeURIComponent(orderId)}/payments`, options);

const fetchPayment = (paymentId, options) => request(`/payments/${encodeURIComponent(paymentId)}`, options);

const capturePayment = (paymentId, amountPaise, options) =>
  request(`/payments/${encodeURIComponent(paymentId)}/capture`, { ...options, method: 'POST', body: { amount: amountPaise, currency: 'INR' } });

/**
 * Checkout hands the browser `razorpay_signature` = HMAC-SHA256(`${order_id}|${payment_id}`, key secret).
 * Only Razorpay (and we) know the secret, so a match proves the payment id belongs to this order.
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }, config = defaultConfig()) => {
  if (!config.keySecret || typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') return false;
  const expected = Buffer.from(crypto.createHmac('sha256', config.keySecret).update(`${orderId}|${paymentId}`).digest('hex'));
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

module.exports = {
  MIN_AMOUNT_PAISE,
  PAYMENT_METHODS,
  capturePayment,
  createOrder,
  fetchOrderPayments,
  fetchPayment,
  isConfigured,
  toPaise,
  verifyPaymentSignature,
};
