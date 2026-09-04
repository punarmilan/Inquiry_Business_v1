const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * Express needs to know how many reverse proxies sit in front of it to recover
 * the real client IP from X-Forwarded-For — get this wrong and every request
 * looks like it came from the proxy, collapsing all rate limiting into one
 * shared bucket. Deployments differ (Caddy alone, Caddy behind Cloudflare, ...),
 * so this is tunable without a code change. Accepts a hop count, a boolean, or
 * an Express trust-proxy string such as "loopback".
 */
const toTrustProxy = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaamsaathi',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),
  otpExpiresMinutes: toNumber(process.env.OTP_EXPIRES_MINUTES, 5),
  otpMaxAttempts: toNumber(process.env.OTP_MAX_ATTEMPTS, 5),
  otpPepper: process.env.OTP_PEPPER || 'dev-otp-pepper-change-me',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  trustProxy: toTrustProxy(process.env.TRUST_PROXY, 1),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  otpRateLimitWindowMs: toNumber(process.env.OTP_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  otpRateLimitMax: toNumber(process.env.OTP_RATE_LIMIT_MAX, 50),
  platformCommissionRate: Number(process.env.PLATFORM_COMMISSION_RATE) || 0.1,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  googleMapsServerApiKey: process.env.GOOGLE_MAPS_SERVER_API_KEY || '',
  googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
};
