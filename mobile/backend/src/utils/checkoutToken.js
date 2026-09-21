const crypto = require('crypto');
const env = require('../config/env');

// The checkout page opens in the phone's browser, which has no app login. This
// short-lived signed token is what proves the link came from the app for that
// exact payment.
const TTL_MS = 30 * 60 * 1000;

const sign = (paymentId, expiresAt) =>
  crypto.createHmac('sha256', `${env.jwtAccessSecret}:razorpay-checkout`).update(`${paymentId}.${expiresAt}`).digest('hex');

const createCheckoutToken = (paymentId, now = Date.now()) => {
  const expiresAt = now + TTL_MS;
  return `${expiresAt}.${sign(paymentId, expiresAt)}`;
};

const verifyCheckoutToken = (paymentId, token, now = Date.now()) => {
  if (typeof token !== 'string') return false;
  const [expiresAt, signature = ''] = token.split('.');
  if (!/^\d{1,15}$/.test(expiresAt) || Number(expiresAt) < now) return false;
  const expected = Buffer.from(sign(paymentId, expiresAt));
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

module.exports = { TTL_MS, createCheckoutToken, verifyCheckoutToken };
