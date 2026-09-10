const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { decodeTemplateAsset } = require('../src/controllers/hyperlocalController');
const {
  deleteTemplateAssetFromCloudinary,
  encodeCloudinaryAssetId,
  getCloudinaryConfig,
  uploadTemplateAssetToCloudinary,
} = require('../src/services/cloudinaryTemplateAssetService');

const cloudinaryEnv = {
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
};

test('Cloudinary can be configured with its standard single URL', () => {
  assert.deepEqual(getCloudinaryConfig({ CLOUDINARY_URL: 'cloudinary://key:secret@demo-cloud' }), {
    cloudName: 'demo-cloud', apiKey: 'key', apiSecret: 'secret',
  });
});

test('template asset upload validates real image bytes and normalizes JPEG mime', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  const decoded = decodeTemplateAsset(png);
  assert.equal(decoded.mimeType, 'image/png');
  assert.ok(decoded.data.length > 8);

  const jpeg = `data:image/jpg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString('base64')}`;
  assert.equal(decodeTemplateAsset(jpeg).mimeType, 'image/jpeg');
});

test('template asset upload rejects unsupported, spoofed, empty, and oversized data', () => {
  assert.throws(() => decodeTemplateAsset('data:text/plain;base64,SGVsbG8='), (error) => error.code === 'TEMPLATE_ASSET_FORMAT_INVALID');
  assert.throws(() => decodeTemplateAsset('data:image/png;base64,SGVsbG8='), (error) => error.code === 'TEMPLATE_ASSET_CONTENT_INVALID');
  assert.throws(() => decodeTemplateAsset('data:image/png;base64,'), (error) => error.code === 'TEMPLATE_ASSET_FORMAT_INVALID');
  const oversized = Buffer.alloc(8_000_001, 0);
  oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.throws(() => decodeTemplateAsset(`data:image/png;base64,${oversized.toString('base64')}`), (error) => error.code === 'TEMPLATE_ASSET_TOO_LARGE');
});

test('validated asset uploads to Cloudinary and returns its secure URL', async () => {
  const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  const asset = await uploadTemplateAssetToCloudinary(
    { dataUrl, name: 'hero.png', mimeType: 'image/png', size: 24 },
    {
      env: cloudinaryEnv,
      fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload');
        assert.equal(Buffer.from(options.headers.Authorization.slice(6), 'base64').toString('utf8'), 'test-key:test-secret');
        const fields = Object.fromEntries(options.body.entries());
        assert.equal(fields.file, dataUrl);
        assert.match(fields.public_id, /^worknai\/offer-template-assets\/asset-/);
        return {
          ok: true,
          json: async () => ({ public_id: fields.public_id, secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/hero.png', bytes: 25 }),
        };
      },
    }
  );
  assert.equal(asset.url, 'https://res.cloudinary.com/test-cloud/image/upload/v1/hero.png');
  assert.equal(asset.storage, 'cloudinary');
  assert.equal(asset.size, 25);
  assert.match(asset._id, /^cld_/);
});

test('Cloudinary template assets can be deleted without exposing their public id', async () => {
  const publicId = 'worknai/offer-template-assets/asset-test';
  const assetId = encodeCloudinaryAssetId(publicId);
  const deleted = await deleteTemplateAssetFromCloudinary(assetId, {
    env: cloudinaryEnv,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/image/destroy');
      const fields = Object.fromEntries(options.body.entries());
      assert.equal(fields.public_id, publicId);
      assert.equal(fields.invalidate, 'true');
      return { ok: true, json: async () => ({ result: 'ok' }) };
    },
  });
  assert.equal(deleted, true);
  assert.equal(await deleteTemplateAssetFromCloudinary('507f1f77bcf86cd799439011'), false);
});

test('upload and delete endpoints remain behind existing admin authentication', () => {
  const routes = fs.readFileSync(path.resolve(__dirname, '../src/routes/hyperlocalRoutes.js'), 'utf8');
  const controller = fs.readFileSync(path.resolve(__dirname, '../src/controllers/hyperlocalController.js'), 'utf8');
  const authIndex = routes.indexOf('router.use(requireAdminAuth)');
  assert.ok(authIndex >= 0);
  assert.ok(routes.indexOf("router.post('/template-assets'", authIndex) > authIndex);
  assert.ok(routes.indexOf("router.delete('/template-assets/:id'", authIndex) > authIndex);
  assert.ok(routes.indexOf("router.get('/template-assets/:id'") < authIndex);
  assert.ok(controller.includes("res.set('Cross-Origin-Resource-Policy', 'cross-origin')"));
});

test('Offer Templates page wires asset actions, JSON tools, preview, and existing publish action', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../admin-frontend/src/pages/hyperlocal/OfferTemplatesPage.tsx'), 'utf8');
  for (const label of ['Copy URL', 'Insert into JSON', 'Replace', 'Delete', 'Format JSON', 'Validate JSON', 'Live preview', 'Convert JSON & publish']) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
  for (const loader of ['TEMPLATE_V2_EXAMPLE', 'FOOD_TEMPLATE_PACK', 'PRESET_TEMPLATES']) assert.ok(page.includes(loader));
  assert.ok(page.includes('Cloudinary secure URL'));
  assert.match(page, /<TemplateCardPreview template=\{jsonPreview\.templates\[0\]\}/);
});
