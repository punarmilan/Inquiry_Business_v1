const test = require('node:test');
const assert = require('node:assert/strict');
const { createOfferSchema } = require('../src/validators/hyperlocal.validator');

const validOffer = (cardDesign) => ({
  body: {
    businessId: '507f1f77bcf86cd799439011',
    title: 'Sample offer',
    description: 'Sample offer description',
    category: 'Food',
    originalPrice: 100,
    offerPrice: 80,
    discountPercentage: 20,
    imageUrls: [],
    cardDesign,
    startsAt: '2026-09-09T10:00:00.000Z',
    expiresAt: '2026-10-09T10:00:00.000Z',
    address: 'Akurdi Railway Station Road',
    locality: 'Wakad',
    latitude: 18.5913,
    longitude: 73.7389,
    phone: '+917225962334',
    whatsapp: '',
    terms: '',
  },
});

test('offer validation accepts an avatar-free custom canvas', () => {
  const payload = validOffer({
    templateId: 'custom',
    templateSource: 'custom',
    avatarId: '',
    primaryColor: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    layout: 'center',
    canvas: {
      width: 1080,
      height: 1080,
      elements: [{ id: 'title', type: 'text' }],
    },
  });

  const { error } = createOfferSchema.validate(payload, { abortEarly: false });
  assert.equal(error, undefined);
});

test('offer validation accepts font sizes exposed by the designer', () => {
  const payload = validOffer({
    templateId: 'custom',
    templateSource: 'custom',
    avatarId: '',
    primaryColor: '#FFFFFF',
    secondaryColor: '#FFFFFF',
    layout: 'center',
    titleFontSize: 96,
    descriptionFontSize: 48,
  });

  const { error } = createOfferSchema.validate(payload, { abortEarly: false });
  assert.equal(error, undefined);
});
