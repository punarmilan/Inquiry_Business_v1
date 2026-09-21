const { randomUUID } = require('crypto');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const ROOT_FOLDER = 'worknai/mobile';
const FOLDERS = Object.freeze({
  profilePhotos: 'profile-photos',
  businessLogos: 'business-logos',
  businessCovers: 'business-covers',
  offers: 'offers',
});

const MAX_IMAGE_BYTES = 8_000_000;
const UPLOAD_TIMEOUT_MS = 60_000;
// Canvas designs are user-supplied JSON; stop descending long before the stack
// could matter. Anything deeper is simply left as-is.
const MAX_WALK_DEPTH = 20;
const DATA_URL_PATTERN = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([a-z0-9+/=\s]+)$/i;

const defaultConfig = () => ({
  cloudName: env.cloudinaryCloudName,
  apiKey: env.cloudinaryApiKey,
  apiSecret: env.cloudinaryApiSecret,
});

const isImageDataUrl = (value) => typeof value === 'string' && /^data:image\//i.test(value);

const decodedSize = (base64) => {
  const clean = base64.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
};

/**
 * Uploads one base64 image data URL and returns its https Cloudinary URL.
 * Only the declared type and size are checked here; Cloudinary's image endpoint
 * rejects bytes that are not a real image, which we surface as a 422.
 */
const uploadImage = async (dataUrl, { folder, config = defaultConfig(), fetchImpl = globalThis.fetch } = {}) => {
  const { cloudName, apiKey, apiSecret } = config;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, 'Image upload is not configured', 'CLOUDINARY_NOT_CONFIGURED');
  }
  if (typeof fetchImpl !== 'function') throw new ApiError(503, 'Image upload is unavailable', 'CLOUDINARY_UNAVAILABLE');

  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) throw new ApiError(422, 'Only PNG, JPEG, WEBP or GIF images are supported', 'IMAGE_FORMAT_INVALID');
  const size = decodedSize(match[2]);
  if (size <= 0 || size > MAX_IMAGE_BYTES) throw new ApiError(422, 'Image must be smaller than 8 MB', 'IMAGE_TOO_LARGE');

  const form = new FormData();
  form.append('file', dataUrl);
  form.append('public_id', `${ROOT_FOLDER}/${folder}/${randomUUID()}`);

  let response;
  try {
    response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(502, 'Could not reach the image storage service', 'CLOUDINARY_UNAVAILABLE');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The error handler does not log, so record what Cloudinary said (never the
    // payload or credentials) for whoever has to diagnose a failed deploy.
    console.error(`[cloudinary] upload failed (${response.status}): ${payload?.error?.message || 'no message'}`);
    // 400 means this particular image was unusable (e.g. not really an image).
    // Anything else (bad credentials, unknown cloud, rate limit, outage) is not
    // something the user can fix by choosing another picture.
    throw response.status === 400
      ? new ApiError(422, 'The image could not be processed. Please choose a different image.', 'IMAGE_REJECTED')
      : new ApiError(502, 'Image storage request failed', 'CLOUDINARY_REQUEST_FAILED');
  }
  if (typeof payload.secure_url !== 'string' || !payload.secure_url.startsWith('https://')) {
    throw new ApiError(502, 'Image storage returned an invalid response', 'CLOUDINARY_RESPONSE_INVALID');
  }
  return payload.secure_url;
};

/** Uploads `value` when it is an image data URL; any other value (https URL, '', undefined) is returned untouched. */
const resolveImage = (value, options) => (isImageDataUrl(value) ? uploadImage(value, options) : value);

/**
 * Returns a copy of `root` (JSON-like data) with every image data URL anywhere
 * inside it replaced by its Cloudinary URL. Identical data URLs are uploaded
 * once, so an image used as both a poster photo and a canvas element shares a
 * single asset.
 */
const resolveImagesDeep = async (root, options) => {
  const uploads = new Map();
  const upload = (dataUrl) => {
    if (!uploads.has(dataUrl)) uploads.set(dataUrl, uploadImage(dataUrl, options));
    return uploads.get(dataUrl);
  };
  const walk = (node, depth) => {
    if (isImageDataUrl(node)) return upload(node);
    if (node === null || typeof node !== 'object' || depth > MAX_WALK_DEPTH) return node;
    if (Array.isArray(node)) return Promise.all(node.map((item) => walk(item, depth + 1)));
    return Promise.all(Object.entries(node).map(async ([key, value]) => [key, await walk(value, depth + 1)])).then(Object.fromEntries);
  };
  return walk(root, 0);
};

module.exports = { FOLDERS, isImageDataUrl, resolveImage, resolveImagesDeep, uploadImage };
