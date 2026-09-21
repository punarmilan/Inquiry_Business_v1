const test = require('node:test');
const assert = require('node:assert/strict');
const { FOLDERS, resolveImage, resolveImagesDeep, uploadImage } = require('../src/services/cloudinaryService');

const config = { cloudName: 'test-cloud', apiKey: 'test-key', apiSecret: 'test-pass' };
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const fakeCloudinary = ({ status = 200, body } = {}) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const fields = Object.fromEntries(options.body.entries());
    calls.push({ url, options, fields });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body ?? { secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${fields.public_id}.png` },
    };
  };
  return { calls, fetchImpl };
};

const silenceErrors = (t) => t.mock.method(console, 'error', () => {});

test('uploadImage sends the data URL to Cloudinary with basic auth and returns the secure URL', async () => {
  const { calls, fetchImpl } = fakeCloudinary();
  const url = await uploadImage(png, { folder: FOLDERS.profilePhotos, config, fetchImpl });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
  assert.equal(Buffer.from(calls[0].options.headers.Authorization.slice(6), 'base64').toString('utf8'), 'test-key:test-pass');
  assert.equal(calls[0].fields.file, png);
  assert.match(calls[0].fields.public_id, /^worknai\/mobile\/profile-photos\/[0-9a-f-]{36}$/);
  assert.equal(url, `https://res.cloudinary.com/test-cloud/image/upload/v1/${calls[0].fields.public_id}.png`);
});

test('uploadImage fails fast, without calling out, when Cloudinary is not configured', async () => {
  const { calls, fetchImpl } = fakeCloudinary();
  await assert.rejects(
    uploadImage(png, { folder: FOLDERS.offers, config: { cloudName: '', apiKey: '', apiSecret: '' }, fetchImpl }),
    (error) => error.statusCode === 503 && error.code === 'CLOUDINARY_NOT_CONFIGURED'
  );
  assert.equal(calls.length, 0);
});

test('uploadImage rejects unsupported types and oversized images before uploading', async () => {
  const { calls, fetchImpl } = fakeCloudinary();
  const options = { folder: FOLDERS.offers, config, fetchImpl };
  await assert.rejects(uploadImage('data:image/svg+xml;base64,PHN2Zy8+', options), (error) => error.code === 'IMAGE_FORMAT_INVALID');
  await assert.rejects(uploadImage('data:image/png;base64,', options), (error) => error.code === 'IMAGE_FORMAT_INVALID');
  const oversized = `data:image/jpeg;base64,${Buffer.alloc(8_000_001, 1).toString('base64')}`;
  await assert.rejects(uploadImage(oversized, options), (error) => error.statusCode === 422 && error.code === 'IMAGE_TOO_LARGE');
  assert.equal(calls.length, 0);
});

test('uploadImage maps Cloudinary failures to a user error or a server error', async (t) => {
  silenceErrors(t);
  const options = (fetchImpl) => ({ folder: FOLDERS.offers, config, fetchImpl });

  const badImage = fakeCloudinary({ status: 400, body: { error: { message: 'Invalid image file' } } });
  await assert.rejects(uploadImage(png, options(badImage.fetchImpl)), (error) => error.statusCode === 422 && error.code === 'IMAGE_REJECTED');

  const badCredentials = fakeCloudinary({ status: 401, body: { error: { message: 'Invalid api_key' } } });
  await assert.rejects(uploadImage(png, options(badCredentials.fetchImpl)), (error) => error.statusCode === 502 && error.code === 'CLOUDINARY_REQUEST_FAILED');

  const unknownCloud = fakeCloudinary({ status: 404, body: { error: { message: 'Invalid cloud_name' } } });
  await assert.rejects(uploadImage(png, options(unknownCloud.fetchImpl)), (error) => error.statusCode === 502);

  const noUrl = fakeCloudinary({ body: { public_id: 'x' } });
  await assert.rejects(uploadImage(png, options(noUrl.fetchImpl)), (error) => error.code === 'CLOUDINARY_RESPONSE_INVALID');

  const unreachable = async () => { throw new Error('ECONNRESET'); };
  await assert.rejects(uploadImage(png, options(unreachable)), (error) => error.statusCode === 502 && error.code === 'CLOUDINARY_UNAVAILABLE');
});

test('resolveImage uploads data URLs and leaves every other value untouched', async () => {
  const { calls, fetchImpl } = fakeCloudinary();
  const options = { folder: FOLDERS.businessLogos, config, fetchImpl };

  assert.equal(await resolveImage('https://res.cloudinary.com/x/a.png', options), 'https://res.cloudinary.com/x/a.png');
  assert.equal(await resolveImage('', options), '');
  assert.equal(await resolveImage(undefined, options), undefined);
  assert.equal(calls.length, 0);

  assert.match(await resolveImage(jpeg, options), /^https:\/\/res\.cloudinary\.com\/test-cloud\/.*business-logos/);
  assert.equal(calls.length, 1);
});

test('resolveImagesDeep replaces every nested data URL once and keeps the rest of the design intact', async () => {
  const { calls, fetchImpl } = fakeCloudinary();
  const input = {
    imageUrls: [png, 'https://example.com/keep.jpg'],
    cardDesign: {
      templateId: 'custom',
      previewUrl: jpeg,
      primaryColor: '#112233',
      canvas: {
        width: 1080,
        backgroundImageUrl: '',
        background: { imageUrl: null, opacity: 0.5 },
        elements: [
          { id: 'a', type: 'image', imageUrl: png, src: png },
          { id: 'b', type: 'text', text: 'data:image is just words here', x: 1 },
        ],
      },
      customizations: { photo: 'https://example.com/other.png' },
    },
  };
  const snapshot = JSON.parse(JSON.stringify(input));

  const output = await resolveImagesDeep(input, { folder: FOLDERS.offers, config, fetchImpl });

  // png is used three times but uploaded once; jpeg once.
  assert.equal(calls.length, 2);
  const [pngUrl] = output.imageUrls;
  assert.match(pngUrl, /^https:\/\/res\.cloudinary\.com\//);
  assert.equal(output.imageUrls[1], 'https://example.com/keep.jpg');
  assert.equal(output.cardDesign.canvas.elements[0].imageUrl, pngUrl);
  assert.equal(output.cardDesign.canvas.elements[0].src, pngUrl);
  assert.match(output.cardDesign.previewUrl, /^https:\/\/res\.cloudinary\.com\//);
  assert.notEqual(output.cardDesign.previewUrl, pngUrl);

  // Everything that is not an image data URL is preserved, including nulls.
  assert.equal(output.cardDesign.templateId, 'custom');
  assert.equal(output.cardDesign.primaryColor, '#112233');
  assert.equal(output.cardDesign.canvas.width, 1080);
  assert.equal(output.cardDesign.canvas.backgroundImageUrl, '');
  assert.deepEqual(output.cardDesign.canvas.background, { imageUrl: null, opacity: 0.5 });
  assert.equal(output.cardDesign.canvas.elements[1].text, 'data:image is just words here');
  assert.equal(output.cardDesign.customizations.photo, 'https://example.com/other.png');

  // The caller's object is not mutated.
  assert.deepEqual(input, snapshot);
});

test('resolveImagesDeep passes undefined fields through and fails the whole call if one upload fails', async (t) => {
  silenceErrors(t);
  const { fetchImpl } = fakeCloudinary();
  const untouched = await resolveImagesDeep({ imageUrls: undefined, cardDesign: undefined }, { folder: FOLDERS.offers, config, fetchImpl });
  assert.deepEqual(untouched, { imageUrls: undefined, cardDesign: undefined });

  const failing = fakeCloudinary({ status: 500, body: {} });
  await assert.rejects(
    resolveImagesDeep({ imageUrls: [png], cardDesign: { previewUrl: jpeg } }, { folder: FOLDERS.offers, config, fetchImpl: failing.fetchImpl }),
    (error) => error.statusCode === 502
  );
});
