const test = require('node:test');
const assert = require('node:assert/strict');
const Setting = require('../src/models/Setting');
const Offer = require('../src/models/Offer');
const { getHomeShowcase } = require('../src/controllers/homeShowcaseController');

test('public showcase keeps admin poster order and uses nearby eligibility aggregation', async () => {
  const originalFindOne = Setting.findOne;
  const originalAggregate = Offer.aggregate;
  const first = '507f1f77bcf86cd799439011';
  const second = '507f1f77bcf86cd799439012';
  let pipeline;
  Setting.findOne = () => ({ select: () => ({ lean: async () => ({ value: {
    banner: { imageUrl: 'https://example.com/banner.webp', title: 'Local', subtitle: '', buttonText: '' },
    trendingOfferIds: [first, second],
  } }) }) });
  Offer.aggregate = async (value) => {
    pipeline = value;
    return [
      { _id: second, cardDesign: { canvas: { width: 1080, height: 1350, elements: [{ id: 'text' }] } } },
      { _id: first, cardDesign: { templateId: 'poster-upload' }, imageUrls: ['https://example.com/poster.png'] },
      { _id: '507f1f77bcf86cd799439013', imageUrls: ['https://example.com/photo.png'] },
    ];
  };
  try {
    const response = await new Promise((resolve, reject) => getHomeShowcase({ query: { longitude: 73.8, latitude: 18.5, radiusKm: 10 } }, { json: resolve }, reject));
    assert.deepEqual(response.trendingOffers.map((offer) => String(offer._id)), [first, second]);
    assert.equal(pipeline[0].$geoNear.maxDistance, 10_000);
    assert.equal(pipeline[0].$geoNear.query.status, 'approved');
    assert.ok(pipeline.some((stage) => stage.$match?.['businessDocument.verificationStatus'] === 'verified'));
  } finally {
    Setting.findOne = originalFindOne;
    Offer.aggregate = originalAggregate;
  }
});
