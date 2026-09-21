const test = require('node:test');
const assert = require('node:assert/strict');
const { updateHomeShowcase } = require('../src/validators/homeShowcase.validator');
const { updateHomeShowcase: publishShowcase, listPosterCandidates } = require('../src/controllers/homeShowcaseController');
const Offer = require('../src/models/Offer');
const Setting = require('../src/models/Setting');

const id = '507f1f77bcf86cd799439011';
const valid = () => ({ body: {
  banner: { imageUrl: 'https://example.com/banner.webp', title: 'Shop local', subtitle: 'Offers near you', buttonText: 'Explore' },
  trendingOfferIds: [id],
} });

test('home showcase accepts editable banner fields and ordered offer IDs', () => {
  assert.equal(updateHomeShowcase.validate(valid()).error, undefined);
  assert.equal(updateHomeShowcase.validate({ body: { banner: { imageUrl: '', title: '', subtitle: '', buttonText: '' }, trendingOfferIds: [] } }).error, undefined);
});

test('home showcase rejects unsafe image URLs and duplicate poster IDs', () => {
  const badUrl = valid();
  badUrl.body.banner.imageUrl = 'javascript:alert(1)';
  assert.ok(updateHomeShowcase.validate(badUrl).error);
  const duplicate = valid();
  duplicate.body.trendingOfferIds.push(id);
  assert.ok(updateHomeShowcase.validate(duplicate).error);
});

test('admin can publish an existing user poster but not a photo-only offer', async () => {
  const originalFind = Offer.find;
  const originalSave = Setting.findOneAndUpdate;
  let offers = [];
  let saved;
  Offer.find = () => ({ populate: () => ({ populate: async () => offers }) });
  Setting.findOneAndUpdate = async (_filter, update) => { saved = update.$set.value; };
  const req = { body: valid().body, admin: { _id: id } };
  const run = () => new Promise((resolve, reject) => publishShowcase(req, { json: resolve }, reject));
  const base = { city: { isActive: true, offersEnabled: true }, business: { isActive: true, verificationStatus: 'verified' } };
  try {
    offers = [{ ...base, imageUrls: ['https://example.com/photo.jpg'], cardDesign: {} }];
    await assert.rejects(run(), { code: 'SHOWCASE_OFFER_NOT_LIVE' });
    offers = [{ ...base, imageUrls: [], cardDesign: { canvas: { width: 1080, height: 1350, elements: [{ id: 'title' }] } } }];
    await run();
    assert.deepEqual(saved.trendingOfferIds, [id]);
  } finally {
    Offer.find = originalFind;
    Setting.findOneAndUpdate = originalSave;
  }
});

test('poster picker searches eligible user designs and returns paginated offers', async () => {
  const originalAggregate = Offer.aggregate;
  let pipeline;
  Offer.aggregate = async (stages) => {
    pipeline = stages;
    return [{ data: [{ _id: id, title: 'User poster' }], meta: [{ total: 31 }] }];
  };
  try {
    const response = await new Promise((resolve, reject) => listPosterCandidates(
      { query: { page: '2', limit: '30', search: 'Coffee' } }, { json: resolve }, reject
    ));
    assert.equal(response.pagination.page, 2);
    assert.equal(response.pagination.pages, 2);
    assert.equal(response.data[0].title, 'User poster');
    assert.equal(pipeline[0].$match.title.$regex, 'Coffee');
    assert.equal(pipeline[0].$match.$or.length, 2);
    assert.ok(pipeline.some((stage) => stage.$match?.['businessDocument.verificationStatus'] === 'verified'));
    assert.ok(pipeline.some((stage) => stage.$match?.['cityDocument.offersEnabled'] === true));
  } finally { Offer.aggregate = originalAggregate; }
});
