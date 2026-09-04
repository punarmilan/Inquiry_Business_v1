const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const AdminUser = require('../models/AdminUser');
const AdminRefreshToken = require('../models/AdminRefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hashToken } = require('../utils/crypto');
const { issueTokenPair } = require('../utils/tokens');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const admin = await AdminUser.findOne({ email: normalizedEmail });
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const tokens = await issueTokenPair(admin);
  res.json({ success: true, admin, ...tokens });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'Invalid token type', 'REFRESH_TOKEN_INVALID_TYPE');
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = await AdminRefreshToken.findOne({
    admin: payload.sub,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token has been revoked or expired', 'REFRESH_TOKEN_REVOKED');
  }

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw new ApiError(401, 'Admin session is no longer active', 'ADMIN_INACTIVE');
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = await issueTokenPair(admin);
  res.json({ success: true, ...tokens });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await AdminRefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
  res.json({ success: true, message: 'Logged out' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, admin: req.admin });
});

module.exports = { login, refresh, logout, me };
