const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Testing bypass for repeated manual QA. Active ONLY outside production, so
 * an accidentally-set variable can never weaken production rate limiting.
 */
const isRateLimitDisabled = (nodeEnv, flag) => nodeEnv !== 'production' && flag === 'true';

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production') {
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = process.env[name]?.trim();
    if (!value || value.length < 32 || /^(?:dev-|test-)|change[-_ ]?me|placeholder/i.test(value)) {
      throw new Error(`Production requires a non-development ${name} of at least 32 characters`);
    }
  }
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('Production access and refresh signing secrets must be distinct');
  }
}

module.exports = {
  nodeEnv,
  port: toNumber(process.env.PORT, 5001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inquiryexperts',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-admin-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-admin-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 200),
  rateLimitDisabled: isRateLimitDisabled(nodeEnv, process.env.DISABLE_RATE_LIMIT),
  platformCommissionRate: Number(process.env.PLATFORM_COMMISSION_RATE) || 0.1,
  googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY || '',
};

module.exports.isRateLimitDisabled = isRateLimitDisabled;
