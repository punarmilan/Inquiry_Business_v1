const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { hashOtp, hashToken } = require('../utils/crypto');
const { issueTokenPair } = require('../utils/tokens');
const { normalizePhone } = require('../utils/phone');

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

// Verifies a Google ID token server-side (audience must match our web client ID so a token
// minted for a different app can't be replayed here) and returns the verified email.
const verifyGoogleToken = async (idToken) => {
  let response;
  try {
    response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  } catch {
    throw new ApiError(401, 'Could not verify Google token', 'OAUTH_VERIFICATION_FAILED');
  }
  if (!response.ok) {
    throw new ApiError(401, 'Invalid or expired Google token', 'INVALID_OAUTH_TOKEN');
  }
  const data = await response.json();
  if (env.googleWebClientId && data.aud !== env.googleWebClientId) {
    throw new ApiError(401, 'Invalid Google token audience', 'INVALID_OAUTH_TOKEN');
  }
  if (!data.email || data.email_verified !== 'true') {
    throw new ApiError(401, 'Google account email is not verified', 'EMAIL_NOT_VERIFIED');
  }
  return { email: String(data.email).trim().toLowerCase(), name: data.name || '' };
};

// Verifies a Facebook access token via the app-token debug endpoint (confirms it was minted
// for *our* app, not just any Facebook app) before trusting the profile it points to.
const verifyFacebookToken = async (accessToken) => {
  const appToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  let debugResponse;
  try {
    debugResponse = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`
    );
  } catch {
    throw new ApiError(401, 'Could not verify Facebook token', 'OAUTH_VERIFICATION_FAILED');
  }
  const debugData = await debugResponse.json();
  if (!debugResponse.ok || !debugData.data?.is_valid || debugData.data.app_id !== env.facebookAppId) {
    throw new ApiError(401, 'Invalid or expired Facebook token', 'INVALID_OAUTH_TOKEN');
  }

  const profileResponse = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
  );
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email) {
    throw new ApiError(401, 'Facebook account has no verified email', 'EMAIL_NOT_VERIFIED');
  }
  return { email: String(profile.email).trim().toLowerCase(), name: profile.name || '' };
};

// Shared by oauthLogin and oauthRegister — verifies whichever provider's token and returns
// { email, name }, or throws a 400/503 ApiError for an unsupported/unconfigured provider.
const verifyOauthProfile = async (provider, token) => {
  if (provider === 'google') {
    if (!env.googleWebClientId) {
      throw new ApiError(503, 'Google login is not configured', 'OAUTH_NOT_CONFIGURED');
    }
    return verifyGoogleToken(token);
  }
  if (provider === 'facebook') {
    if (!env.facebookAppId || !env.facebookAppSecret) {
      throw new ApiError(503, 'Facebook login is not configured', 'OAUTH_NOT_CONFIGURED');
    }
    return verifyFacebookToken(token);
  }
  throw new ApiError(400, 'Unsupported OAuth provider', 'UNSUPPORTED_PROVIDER');
};

// Accounts are always created phone-first (see verifyOtp's register branch below) — email is
// only ever a secondary, optional identifier a user adds later from their profile. So an OTP
// request identifies the account by whichever of phone/email was sent (validators enforce
// exactly one), but only phone can ever *create* a new account.
const resolveIdentifier = (body) => {
  if (body.email) {
    return { field: 'email', value: String(body.email).trim().toLowerCase() };
  }
  return { field: 'phone', value: normalizePhone(body.phone) };
};

const loginWithPassword = asyncHandler(async (req, res) => {
  const { field, value } = resolveIdentifier(req.body);
  const { password } = req.body;

  const identifierValues = field === 'phone' && value.startsWith('+91') ? [value, value.slice(3)] : [value];
  const user = await User.findOne({ [field]: identifierValues.length === 1 ? value : { $in: identifierValues } });
  if (!user || !user.name) {
    throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
  }

  if (!user.isActive) {
    throw new ApiError(401, 'User session is no longer active', 'USER_INACTIVE');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'User is blocked', 'USER_BLOCKED');
  }

  if (!user.passwordHash) {
    throw new ApiError(401, 'Password login is not set up. Please use OTP login.', 'PASSWORD_NOT_SET');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const tokens = await issueTokenPair(user);
  res.json({
    success: true,
    user,
    isNewUser: false,
    ...tokens,
  });
});

// Google/Facebook login only ever authenticates an *existing* account whose profile already
// has this email attached — same rule as email-based OTP login (see resolveIdentifier above).
// It never creates a new account, since accounts are always created phone-first.
const oauthLogin = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;
  const profile = await verifyOauthProfile(provider, token);

  const user = await User.findOne({ email: profile.email });
  if (!user || !user.name) {
    throw new ApiError(
      404,
      'No account found with this email. Please register with your phone number first.',
      'USER_NOT_REGISTERED'
    );
  }

  if (!user.isActive) {
    throw new ApiError(401, 'User session is no longer active', 'USER_INACTIVE');
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'User is blocked', 'USER_BLOCKED');
  }

  const tokens = await issueTokenPair(user);
  res.json({
    success: true,
    user,
    isNewUser: false,
    ...tokens,
  });
});

// Creates a new account straight from a verified Google/Facebook profile — the one exception
// to "accounts are always created phone-first via OTP". The tradeoff: phone ownership is NOT
// verified here (no OTP round-trip), only email ownership (via the OAuth token). Chosen
// deliberately to keep OAuth signup one-tap; the phone number is still required (calling,
// live location etc. depend on a real one) but the user can't prove they own it at this step.
const oauthRegister = asyncHandler(async (req, res) => {
  const { provider, token } = req.body;
  const profile = await verifyOauthProfile(provider, token);
  const normalizedPhone = normalizePhone(req.body.phone);

  const existingEmailUser = await User.findOne({ email: profile.email });
  if (existingEmailUser && existingEmailUser.name) {
    throw new ApiError(409, 'An account already exists for this email. Please login instead.', 'EMAIL_ALREADY_REGISTERED');
  }

  let user = await User.findOne({ phone: normalizedPhone });
  if (user && user.name) {
    throw new ApiError(409, 'This phone number is already registered. Please login instead.', 'PHONE_ALREADY_REGISTERED');
  }

  if (!user) {
    user = new User({ phone: normalizedPhone });
  }
  user.name = profile.name || profile.email.split('@')[0];
  user.email = profile.email;
  user.accountType = 'employer';
  user.role = 'user';
  user.isActive = true;
  user.termsAccepted = true;
  user.termsAcceptedAt = new Date();
  await user.save();

  const tokens = await issueTokenPair(user);
  res.json({
    success: true,
    user,
    isNewUser: true,
    ...tokens,
  });
});

const sendOtp = asyncHandler(async (req, res) => {
  const { field, value: identifier } = resolveIdentifier(req.body);
  const { intent = 'login' } = req.body;

  if (field === 'email' && intent === 'register') {
    // Accounts are always created phone-first — there's no such thing as "register with
    // just an email", so this combination is never valid.
    throw new ApiError(422, 'Registration requires a phone number', 'PHONE_REQUIRED_FOR_REGISTRATION');
  }

  if (intent === 'login') {
    const user = await User.findOne({ [field]: identifier });
    if (!user || !user.name) {
      throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
    }
  }

  const otp = generateOtp();

  await OtpVerification.deleteMany({ identifier, consumedAt: null });
  await OtpVerification.create({
    identifier,
    otpHash: hashOtp(identifier, otp),
    expiresAt: new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000),
  });

  // TODO: Plug in MSG91/Twilio (phone) or an email provider here to actually deliver `otp`.
  // When real delivery is enabled, remove `otp` from this API response.
  res.json({
    success: true,
    otp,
    message: 'OTP sent (dev mode)',
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { field, value: identifier } = resolveIdentifier(req.body);
  const { otp, intent = 'login' } = req.body;

  const record = await OtpVerification.findOne({ identifier, consumedAt: null }).sort({ createdAt: -1 });
  if (!record) {
    throw new ApiError(400, 'Invalid OTP', 'OTP_INVALID');
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'Expired OTP', 'OTP_EXPIRED');
  }

  if (record.attempts >= env.otpMaxAttempts) {
    throw new ApiError(429, 'Maximum OTP attempts exceeded', 'OTP_ATTEMPTS_EXCEEDED');
  }

  if (record.otpHash !== hashOtp(identifier, otp)) {
    record.attempts += 1;
    await record.save();
    const remainingAttempts = Math.max(env.otpMaxAttempts - record.attempts, 0);
    throw new ApiError(400, 'Invalid OTP', 'OTP_INVALID', { remainingAttempts });
  }

  record.consumedAt = new Date();
  await record.save();

  let user = await User.findOne({ [field]: identifier });

  if (field === 'email' && (!user || !user.name)) {
    throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
  }

  if (intent === 'login' && (!user || !user.name)) {
    throw new ApiError(404, 'No account found. Please register first.', 'USER_NOT_REGISTERED');
  }

  if (!user) {
    user = await User.create({ phone: identifier, isActive: true });
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'User is blocked', 'USER_BLOCKED');
  }

  const isNewUser = !user.name;

  const tokens = await issueTokenPair(user);
  res.json({
    success: true,
    user,
    isNewUser,
    ...tokens,
  });
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
  const storedToken = await RefreshToken.findOne({
    user: payload.sub,
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new ApiError(401, 'Refresh token has been revoked or expired', 'REFRESH_TOKEN_REVOKED');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.isBlocked) {
    throw new ApiError(401, 'User session is no longer active', 'USER_INACTIVE');
  }

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = await issueTokenPair(user);
  res.json({ success: true, ...tokens });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
  res.json({ success: true, message: 'Logged out' });
});

module.exports = { loginWithPassword, oauthLogin, oauthRegister, sendOtp, verifyOtp, refresh, logout };
