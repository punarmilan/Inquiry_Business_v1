const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobileAvailability = require('../src/services/providerAvailabilityService');
const adminAvailability = require('../../../website/backend/src/services/providerAvailabilityService');

const matches = (actual, expected) => {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    if ('$ne' in expected) return actual !== expected.$ne;
    if ('$in' in expected) return expected.$in.includes(actual);
  }
  if (Array.isArray(actual)) return actual.includes(expected);
  return String(actual) === String(expected);
};

const makeModels = ({ availability = 'available', bookings = [] } = {}) => {
  const worker = {
    _id: 'provider-1',
    isActive: true,
    verificationStatus: 'verified',
    availability,
    city: 'city-1',
    categories: ['category-1'],
  };

  const WorkerModel = {
    findOneAndUpdate: async (filter, update) => {
      if (!Object.entries(filter).every(([key, expected]) => matches(worker[key], expected))) return null;
      Object.assign(worker, update.$set || {});
      return { ...worker };
    },
  };
  const BookingModel = {
    exists: async ({ worker: workerId, status }) =>
      bookings.some((booking) => String(booking.worker) === String(workerId) && status.$in.includes(booking.status)),
  };

  return { worker, WorkerModel, BookingModel };
};

for (const [name, availabilityModule] of [
  ['mobile API', mobileAvailability],
  ['admin API', adminAvailability],
]) {
  test(`${name}: only one simultaneous booking can acquire an available provider`, async () => {
    const models = makeModels();
    const service = availabilityModule.createProviderAvailabilityService(models);
    const claims = await Promise.all([
      service.acquireProvider('provider-1'),
      service.acquireProvider('provider-1'),
    ]);

    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(models.worker.availability, 'busy');
  });

  test(`${name}: offline and busy providers cannot be acquired`, async () => {
    for (const availability of ['offline', 'busy']) {
      const models = makeModels({ availability });
      const service = availabilityModule.createProviderAvailabilityService(models);
      assert.equal(await service.acquireProvider('provider-1'), null);
      assert.equal(models.worker.availability, availability);
    }
  });

  test(`${name}: active booking blocks provider and admin availability overrides`, async () => {
    const models = makeModels({
      availability: 'busy',
      bookings: [{ worker: 'provider-1', status: 'assigned' }],
    });
    const service = availabilityModule.createProviderAvailabilityService(models);

    assert.equal(await service.releaseProviderIfIdle('provider-1'), null);
    assert.equal((await service.setManualAvailability('provider-1', 'available')).blockedByBooking, true);
    assert.equal((await service.setManualAvailability('provider-1', 'offline')).blockedByBooking, true);
    assert.equal(models.worker.availability, 'busy');
  });

  test(`${name}: completed and cancelled bookings release a busy provider`, async () => {
    for (const status of ['completed', 'cancelled']) {
      const models = makeModels({ availability: 'busy', bookings: [{ worker: 'provider-1', status }] });
      const service = availabilityModule.createProviderAvailabilityService(models);
      assert.ok(await service.releaseProviderIfIdle('provider-1'));
      assert.equal(models.worker.availability, 'available');
    }
  });

  test(`${name}: requested, confirmed, completed and cancelled are not blocking statuses`, async () => {
    assert.deepEqual(availabilityModule.ACTIVE_PROVIDER_BOOKING_STATUSES, ['assigned', 'in_progress']);
    for (const status of ['requested', 'confirmed', 'completed', 'cancelled']) {
      const models = makeModels({ availability: 'busy', bookings: [{ worker: 'provider-1', status }] });
      const service = availabilityModule.createProviderAvailabilityService(models);
      assert.ok(await service.releaseProviderIfIdle('provider-1'));
    }
  });
}

test('admin forwarding selects only available providers before creating notifications', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../../website/backend/src/controllers/hyperlocalController.js'),
    'utf8'
  );
  const forwardBooking = source.slice(source.indexOf('const forwardBooking'), source.indexOf('const updateBookingStatus'));
  assert.match(forwardBooking, /availability:\s*'available'/);
  assert.match(forwardBooking, /eligible\.map\(\(worker\)\s*=>\s*notifyUser/s);
});

test('provider acceptance acquires the provider before claiming and notifying', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/controllers/serviceController.js'), 'utf8');
  const handler = source.slice(source.indexOf('const respondToProviderBooking'), source.indexOf('const updateProviderBookingStatus'));
  assert.ok(handler.indexOf('await acquireProvider') < handler.indexOf('ServiceBooking.findOneAndUpdate'));
  assert.ok(handler.indexOf('ServiceBooking.findOneAndUpdate') < handler.indexOf('await notifyUser'));
});
