const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { normalizePhone } = require('../utils/phone');

/**
 * IPv6 clients can rotate freely inside their own /64, so a full-address key
 * is trivially defeated. Bucket the prefix instead; IPv4 is used as-is.
 */
const ipKey = (ip) => {
  const value = String(ip || '');
  if (!value.includes(':')) return value;
  return `${value.split(':').slice(0, 4).join(':')}::/64`;
};

const identifierKey = (req) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = normalizePhone(req.body?.phone);
  return email || phone || ipKey(req.ip);
};

const retryAfterSeconds = (req) => {
  const resetTime = req.rateLimit?.resetTime?.getTime?.();
  return resetTime ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)) : undefined;
};

const rateLimitHandler = (code, message) => (req, res) => {
  const retryAfter = retryAfterSeconds(req);
  if (retryAfter) res.setHeader('Retry-After', String(retryAfter));
  res.status(429).json({
    success: false,
    error: {
      code,
      message,
      ...(retryAfter ? { details: { retryAfterSeconds: retryAfter } } : {}),
    },
  });
};

const isLocalDevelopmentRequest = (req) =>
  env.nodeEnv !== 'production' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(String(req.ip || ''));

// Manual-QA bypass. Active only when env.rateLimitDisabled is true, which the
// config allows solely outside production.
const skipWhenDisabled = () => env.rateLimitDisabled === true;

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Authentication has dedicated identifier-aware limiters below. Sharing the
  // general API bucket with login/OTP lets normal screen loading consume the
  // allowance and can block a valid login with a generic 429 response.
  // Notification polling and city/location discovery have their own isolated
  // pollingLimiter below, so they neither starve nor are starved by this
  // general bucket.
  skip: (req) =>
    req.path.startsWith('/auth/') ||
    req.path.startsWith('/notifications') ||
    req.path.startsWith('/cities') ||
    isLocalDevelopmentRequest(req) ||
    skipWhenDisabled(),
  keyGenerator: (req) => ipKey(req.ip),
  handler: rateLimitHandler('RATE_LIMITED', 'Too many requests. Please wait a few minutes and try again.'),
});

// High-frequency polling endpoints (notification refresh, city/location
// discovery) share one isolated bucket with the same budget as the global
// limiter — isolation, not a higher allowance. Their traffic no longer
// consumes the general API bucket and vice versa.
const pollingLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipWhenDisabled(),
  keyGenerator: (req) => ipKey(req.ip),
  handler: rateLimitHandler('RATE_LIMITED', 'Too many requests. Please wait a few minutes and try again.'),
});

// Failed login attempts are limited per identifier and caller, so one account
// cannot be brute-forced without also allowing successful logins to continue.
// Successful requests are removed from the bucket automatically.
const loginLimiter = rateLimit({
  windowMs: env.loginRateLimitWindowMs,
  limit: env.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => skipWhenDisabled(),
  keyGenerator: (req) => `${identifierKey(req)}:${ipKey(req.ip)}`,
  handler: rateLimitHandler('LOGIN_RATE_LIMITED', 'Too many login attempts. Please wait a few minutes and try again.'),
});

/**
 * Keyed by phone number rather than IP.
 *
 * Indian mobile carriers run large-scale CGNAT, so thousands of unrelated
 * subscribers share one public address — an IP-keyed OTP limit locks out
 * everyone behind a busy tower once a handful of them sign up. The phone
 * number is also the thing actually worth protecting, since it is what
 * receives the SMS and what an attacker would try to flood.
 *
 * `validate` runs before this in the route, so req.body.phone is present and
 * trimmed; the IP fallback only guards against that order being changed.
 */
const otpLimiter = rateLimit({
  windowMs: env.otpRateLimitWindowMs,
  limit: env.otpRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipWhenDisabled(),
  keyGenerator: (req) => normalizePhone(req.body?.phone) || ipKey(req.ip),
  handler: rateLimitHandler('OTP_RATE_LIMITED', 'Too many OTP requests. Please wait a few minutes and try again.'),
});

module.exports = { globalLimiter, pollingLimiter, loginLimiter, otpLimiter };
