const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const verifyGoogleToken = async (idToken) => {
  let response;
  try {
    response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  } catch {
    throw new ApiError(401, 'Could not verify Google token', 'OAUTH_VERIFICATION_FAILED');
  }
  if (!response.ok) throw new ApiError(401, 'Invalid or expired Google token', 'INVALID_OAUTH_TOKEN');
  const data = await response.json();
  if (env.googleWebClientId && data.aud !== env.googleWebClientId) {
    throw new ApiError(401, 'Invalid Google token audience', 'INVALID_OAUTH_TOKEN');
  }
  const email = String(data.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || data.email_verified !== 'true') {
    throw new ApiError(401, 'Google account email is not verified', 'EMAIL_NOT_VERIFIED');
  }
  return { email, name: data.name || '' };
};

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

const verifyOauthProfile = async (provider, token) => {
  if (provider === 'google') {
    if (!env.googleWebClientId) throw new ApiError(503, 'Google login is not configured', 'OAUTH_NOT_CONFIGURED');
    return verifyGoogleToken(token);
  }
  if (provider === 'facebook') {
    if (!env.facebookAppId || !env.facebookAppSecret) throw new ApiError(503, 'Facebook login is not configured', 'OAUTH_NOT_CONFIGURED');
    return verifyFacebookToken(token);
  }
  throw new ApiError(400, 'Unsupported OAuth provider', 'UNSUPPORTED_PROVIDER');
};

module.exports = { verifyGoogleToken, verifyFacebookToken, verifyOauthProfile };
