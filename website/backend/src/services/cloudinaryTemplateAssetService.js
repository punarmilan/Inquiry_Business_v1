const { randomUUID } = require('crypto');
const ApiError = require('../utils/ApiError');

const TEMPLATE_ASSET_PREFIX = 'worknai/offer-template-assets/';

const getCloudinaryConfig = (env = process.env) => {
  let cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  let apiKey = env.CLOUDINARY_API_KEY?.trim();
  let apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if ((!cloudName || !apiKey || !apiSecret) && env.CLOUDINARY_URL) {
    try {
      const credentials = new URL(env.CLOUDINARY_URL.trim());
      if (credentials.protocol === 'cloudinary:') {
        cloudName = decodeURIComponent(credentials.hostname);
        apiKey = decodeURIComponent(credentials.username);
        apiSecret = decodeURIComponent(credentials.password);
      }
    } catch {
      // The generic configuration error below deliberately excludes secret values.
    }
  }
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, 'Cloudinary asset upload is not configured', 'CLOUDINARY_NOT_CONFIGURED');
  }
  return { cloudName, apiKey, apiSecret };
};

const encodeCloudinaryAssetId = (publicId) => `cld_${Buffer.from(publicId, 'utf8').toString('base64url')}`;

const decodeCloudinaryAssetId = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.startsWith('cld_')) return null;
  let publicId = '';
  try {
    publicId = Buffer.from(assetId.slice(4), 'base64url').toString('utf8');
  } catch {
    throw new ApiError(422, 'Invalid Cloudinary asset id', 'TEMPLATE_ASSET_ID_INVALID');
  }
  if (!publicId.startsWith(TEMPLATE_ASSET_PREFIX) || publicId.length > 300) {
    throw new ApiError(422, 'Invalid Cloudinary asset id', 'TEMPLATE_ASSET_ID_INVALID');
  }
  return publicId;
};

const cloudinaryRequest = async (action, form, options = {}) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig(options.env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new ApiError(503, 'Cloudinary upload is unavailable', 'CLOUDINARY_UNAVAILABLE');

  let response;
  try {
    response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/${action}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
      body: form,
    });
  } catch {
    throw new ApiError(502, 'Could not reach Cloudinary', 'CLOUDINARY_UNAVAILABLE');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.message === 'string' ? payload.error.message : 'Cloudinary request failed';
    throw new ApiError(502, message, 'CLOUDINARY_REQUEST_FAILED');
  }
  return payload;
};

const uploadTemplateAssetToCloudinary = async ({ dataUrl, name, mimeType, size }, options = {}) => {
  const publicId = `${TEMPLATE_ASSET_PREFIX}asset-${randomUUID()}`;
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('public_id', publicId);
  if (name) form.append('display_name', String(name).slice(0, 180));
  const payload = await cloudinaryRequest('upload', form, options);
  if (typeof payload.secure_url !== 'string' || !payload.secure_url.startsWith('https://')) {
    throw new ApiError(502, 'Cloudinary did not return a secure asset URL', 'CLOUDINARY_RESPONSE_INVALID');
  }
  return {
    _id: encodeCloudinaryAssetId(payload.public_id || publicId),
    name: typeof name === 'string' && name.trim() ? name.slice(0, 180) : 'template-asset',
    mimeType,
    size: typeof payload.bytes === 'number' ? payload.bytes : size,
    url: payload.secure_url,
    storage: 'cloudinary',
  };
};

const deleteTemplateAssetFromCloudinary = async (assetId, options = {}) => {
  const publicId = decodeCloudinaryAssetId(assetId);
  if (!publicId) return false;
  const form = new FormData();
  form.append('public_id', publicId);
  form.append('invalidate', 'true');
  await cloudinaryRequest('destroy', form, options);
  return true;
};

module.exports = {
  decodeCloudinaryAssetId,
  deleteTemplateAssetFromCloudinary,
  encodeCloudinaryAssetId,
  getCloudinaryConfig,
  uploadTemplateAssetToCloudinary,
};
