const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Shared by the HTTP `requireAuth` middleware and the Socket.IO auth middleware
// (src/socket/index.js) so there's one implementation of "is this access token valid".
const verifyAccessToken = async (token) => {
  if (!token) {
    throw new ApiError(401, 'Missing bearer token', 'AUTH_TOKEN_MISSING');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired access token', 'AUTH_TOKEN_INVALID');
  }

  if (payload.type !== 'access') {
    throw new ApiError(401, 'Invalid token type', 'AUTH_TOKEN_INVALID_TYPE');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User session is no longer active', 'USER_INACTIVE');
  }
  if (user.isBlocked) {
    throw new ApiError(403, 'User is blocked', 'USER_BLOCKED');
  }

  return user;
};

const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Missing bearer token', 'AUTH_TOKEN_MISSING');
  }

  req.user = await verifyAccessToken(token);
  next();
});

const requireAdmin = (req, _res, next) => {
  if (!req.user || !['staff', 'admin', 'superadmin'].includes(req.user.role)) {
    return next(new ApiError(403, 'Admin access required', 'ADMIN_REQUIRED'));
  }
  return next();
};

const requireStaff = requireAdmin;

module.exports = { requireAuth, requireAdmin, requireStaff, verifyAccessToken };
