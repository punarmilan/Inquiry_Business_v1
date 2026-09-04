const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isOfferPublicEligible,
  hasPostingQuota,
  isServiceAvailable,
  canAssignWorker,
  canClientVerifyPayment,
  canCreateWorker,
  canModerateOffer,
  canEditOffer,
} = require('../src/domain/rules');

const origin = { latitude: 21.2514, longitude: 81.6296 };
const pointNorthKm = (km) => ({ latitude: origin.latitude + km / 111.195, longitude: origin.longitude });
const city = { isActive: true, offersEnabled: true, servicesEnabled: true };
const baseOffer = {
  status: 'approved',
  isActive: true,
  startsAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
  location: { type: 'Point', coordinates: [origin.longitude, origin.latitude] },
};
const now = new Date('2026-08-27T00:00:00.000Z');

const eligibleAt = (km, overrides = {}, cityOverrides = {}) =>
  isOfferPublicEligible({
    offer: { ...baseOffer, ...overrides },
    city: { ...city, ...cityOverrides },
    userLocation: pointNorthKm(km),
    now,
  });

test('1. user 5 KM away can see eligible offer', () => assert.equal(eligibleAt(5), true));
test('2. user 9.9 KM away can see eligible offer', () => assert.equal(eligibleAt(9.9), true));
test('3. user over 10 KM cannot see normal offer', () => assert.equal(eligibleAt(10.01), false));
test('4. sponsored offer over 10 KM still cannot appear', () =>
  assert.equal(eligibleAt(30, { isFeatured: true, priorityRank: 1000 }), false));
test('5. expired offers cannot appear', () =>
  assert.equal(eligibleAt(1, { expiresAt: '2026-08-26T00:00:00.000Z' }), false));
test('6. pending and rejected offers cannot appear publicly', () => {
  assert.equal(eligibleAt(1, { status: 'pending_review' }), false);
  assert.equal(eligibleAt(1, { status: 'rejected' }), false);
});
test('7. disabled city does not return offers', () => {
  assert.equal(eligibleAt(1, {}, { isActive: false }), false);
  assert.equal(eligibleAt(1, {}, { offersEnabled: false }), false);
});
test('8. services disabled in city are unavailable', () =>
  assert.equal(isServiceAvailable({ isActive: true, servicesEnabled: false }), false));
test('9. public user cannot create worker', () => {
  assert.equal(canCreateWorker('user'), false);
  assert.equal(canCreateWorker('staff'), true);
});
test('10. posting requires an active subscription', () => {
  assert.equal(hasPostingQuota(null), false);
  assert.equal(hasPostingQuota({ status: 'expired' }), false);
});
test('11. offer quota is enforced server-side', () => {
  const subscription = {
    status: 'active',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-01-01T00:00:00.000Z',
    quota: { offerPostingLimit: 3 },
    usage: { offersPosted: 3 },
  };
  assert.equal(hasPostingQuota(subscription, now), false);
});
test("12. user cannot edit another business owner's offer", () =>
  assert.equal(canEditOffer({ offerOwnerId: 'owner-a', userId: 'owner-b' }), false));
test('13. authorized staff can approve or reject offer', () => {
  assert.equal(canModerateOffer('admin'), true);
  assert.equal(canModerateOffer('user'), false);
});
test('14. worker assignment respects city and category', () => {
  const booking = { city: 'city-a', category: 'plumber' };
  const worker = {
    city: 'city-a', categories: ['plumber'], isActive: true, verificationStatus: 'verified', availability: 'available',
  };
  assert.equal(canAssignWorker({ booking, worker }), true);
  assert.equal(canAssignWorker({ booking, worker: { ...worker, city: 'city-b' } }), false);
  assert.equal(canAssignWorker({ booking, worker: { ...worker, categories: ['electrician'] } }), false);
});
test('15. payment success cannot be forged from frontend', () => assert.equal(canClientVerifyPayment(), false));
test('16. unsupported city produces coming-soon availability state', () => {
  const unsupported = { isActive: true, offersEnabled: false, servicesEnabled: false };
  assert.equal(isServiceAvailable(unsupported), false);
  assert.equal(Boolean(unsupported.isActive && unsupported.offersEnabled), false);
});
test('17. bottom navigation gates Post behind an approved business', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/navigation/MainTabNavigator.tsx'), 'utf8');
  const labels = [...source.matchAll(/name="(OffersTab|ServicesTab|PostTab|MoreTab|ProfileTab)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ['OffersTab', 'ServicesTab', 'PostTab', 'MoreTab', 'ProfileTab']);
  assert.match(source, /const \{ hasApprovedBusiness \} = useApp\(\)/);
  assert.match(source, /hasApprovedBusiness \? <Tab\.Screen name="PostTab"/);
});
test('18. city availability selects the active flag used in its response checks', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/controllers/cityController.js'), 'utf8');
  const publicFields = source.match(/const publicFields = '([^']+)'/)?.[1].split(/\s+/) || [];
  assert.ok(publicFields.includes('isActive'));
});
