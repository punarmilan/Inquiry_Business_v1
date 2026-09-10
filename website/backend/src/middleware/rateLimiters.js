const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  // Manual-QA bypass. Active only when env.rateLimitDisabled is true, which
  // the config allows solely outside production.
  skip: (req) => env.rateLimitDisabled === true,
});

module.exports = { globalLimiter };
