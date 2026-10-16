const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/controllers/hyperlocalController');
const schemas = require('../src/validators/hyperlocal.validator');
const Worker = require('../src/models/Worker');
const User = require('../src/models/User');
const ProviderApplication = require('../src/models/ProviderApplication');
const ServiceBooking = require('../src/models/ServiceBooking');
const City = require('../src/models/City');
const ServiceCategory = require('../src/models/ServiceCategory');

const ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const invoke = (handler, query = {}) => new Promise((resolve, reject) => {
  handler({ params: { id: ID }, query, body: {} }, { json: resolve }, reject);
});

const stubDelete = (t, { worker = { _id: ID }, booking = null, deleted = worker } = {}) => {
  const calls = { bookingFilters: [], deletes: [], favourites: [], applications: [], accounts: [] };
  t.mock.method(Worker, 'findById', async () => worker);
  t.mock.method(ServiceBooking, 'exists', async (filter) => { calls.bookingFilters.push(filter); return booking; });
  t.mock.method(Worker, 'findOneAndDelete', async (filter) => { calls.deletes.push(filter); return deleted; });
  t.mock.method(User, 'updateMany', async (filter, update) => { calls.favourites.push({ filter, update }); return {}; });
  t.mock.method(ProviderApplication, 'updateMany', async (filter, update) => { calls.applications.push({ filter, update }); return {}; });
  t.mock.method(User, 'updateOne', async (filter, update) => { calls.accounts.push({ filter, update }); return {}; });
  t.mock.method(User, 'deleteOne', () => assert.fail('Provider deletion must not delete a user account'));
  t.mock.method(ServiceBooking, 'deleteMany', () => assert.fail('Provider deletion must not delete booking history'));
  return calls;
};

test('permanently removes an unbooked directory provider and clears saved/application references', async (t) => {
  const calls = stubDelete(t);
  const result = await invoke(controller.hardDeleteWorker);
  assert.deepEqual(result, { success: true, deletedId: ID });
  assert.deepEqual(calls.deletes, [{ _id: ID, availability: { $ne: 'busy' } }]);
  assert.deepEqual(calls.favourites, [{ filter: { savedProviders: ID }, update: { $pull: { savedProviders: ID } } }]);
  assert.deepEqual(calls.applications, [{ filter: { approvedWorker: ID }, update: { $unset: { approvedWorker: '' } } }]);
  assert.deepEqual(calls.accounts, []);
});

test('deactivates a linked login without deleting that user or changing unrelated accounts', async (t) => {
  const calls = stubDelete(t, { worker: { _id: ID, user: USER_ID } });
  await invoke(controller.hardDeleteWorker);
  assert.deepEqual(calls.accounts, [{ filter: { _id: USER_ID }, update: { $set: { isActive: false } } }]);
});

test('an unknown provider returns 404 without changing any records', async (t) => {
  const calls = stubDelete(t, { worker: null });
  await assert.rejects(invoke(controller.hardDeleteWorker), (error) => error.statusCode === 404 && error.code === 'WORKER_NOT_FOUND');
  assert.deepEqual(calls, { bookingFilters: [], deletes: [], favourites: [], applications: [], accounts: [] });
});

test('assigned and forwarded booking history prevents deletion and leaves accounts/references unchanged', async (t) => {
  const calls = stubDelete(t, { worker: { _id: ID, user: USER_ID }, booking: { _id: 'completed-booking' } });
  await assert.rejects(invoke(controller.hardDeleteWorker), (error) => error.statusCode === 409 && error.code === 'WORKER_HAS_BOOKINGS');
  assert.deepEqual(calls.bookingFilters, [{ $or: [{ worker: ID }, { 'dispatchedProviders.provider': ID }] }]);
  assert.equal(calls.deletes.length, 0);
  assert.equal(calls.favourites.length + calls.applications.length + calls.accounts.length, 0);
});

test('an assignment that reserves the provider during deletion returns a conflict without cleanup', async (t) => {
  const calls = stubDelete(t, { worker: { _id: ID, user: USER_ID }, deleted: null });
  await assert.rejects(invoke(controller.hardDeleteWorker), (error) => error.statusCode === 409 && error.code === 'WORKER_DELETE_CONFLICT');
  assert.equal(calls.deletes.length, 1);
  assert.equal(calls.favourites.length + calls.applications.length + calls.accounts.length, 0);
});

test('inactive providers have the same permanent deletion option', async (t) => {
  stubDelete(t, { worker: { _id: ID, isActive: false, availability: 'offline' } });
  const result = await invoke(controller.hardDeleteWorker);
  assert.equal(result.deletedId, ID);
});

test('provider list accepts active/inactive filters and rejects invalid ids and filter values', () => {
  for (const isActive of ['true', 'false']) {
    const result = schemas.workerList.validate({ query: { isActive, page: 2, limit: 20, search: 'Plumber' } });
    assert.equal(result.error, undefined);
    assert.equal(result.value.query.isActive, isActive === 'true');
  }
  assert.ok(schemas.workerList.validate({ query: { isActive: 'maybe' } }).error);
  assert.ok(schemas.deleteById.validate({ params: { id: 'invalid-id' }, query: {}, body: {} }).error);
});

test('search and active filters apply before pagination, including city/category matches and literal symbols', async (t) => {
  const calls = { filters: [], skip: null, limit: null, sort: null };
  const chain = {
    sort(value) { calls.sort = value; return this; },
    skip(value) { calls.skip = value; return this; },
    limit(value) { calls.limit = value; return this; },
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve([{ _id: ID, name: 'A+B Repairs' }]).then(resolve, reject); },
  };
  t.mock.method(City, 'find', () => ({ select: () => ({ lean: async () => [{ _id: 'city1' }] }) }));
  t.mock.method(ServiceCategory, 'find', () => ({ select: () => ({ lean: async () => [{ _id: 'category1' }] }) }));
  t.mock.method(Worker, 'find', (filter) => { calls.filters.push(filter); return chain; });
  t.mock.method(Worker, 'countDocuments', async (filter) => { calls.filters.push(filter); return 25; });
  const result = await invoke(controller.listWorkers, { page: 2, limit: 20, search: ' A+B ', isActive: false });
  assert.deepEqual(result.pagination, { total: 25, page: 2, limit: 20, pages: 2 });
  assert.equal(calls.skip, 20);
  assert.equal(calls.limit, 20);
  assert.deepEqual(calls.sort, { createdAt: -1, _id: -1 });
  assert.deepEqual(calls.filters[0], calls.filters[1]);
  assert.equal(calls.filters[0].isActive, false);
  assert.ok(calls.filters[0].$or[0].name.test('a+b Repairs'));
  assert.ok(!calls.filters[0].$or[0].name.test('AAAB Repairs'));
  assert.deepEqual(calls.filters[0].$or.slice(3), [{ city: { $in: ['city1'] } }, { categories: { $in: ['category1'] } }]);
});

test('permanent deletion route sits behind admin authentication', () => {
  const router = require('../src/routes/hyperlocalRoutes');
  const { requireAdminAuth } = require('../src/middleware/auth');
  const authIndex = router.stack.findIndex((layer) => layer.handle === requireAdminAuth);
  const deleteIndex = router.stack.findIndex((layer) => layer.route?.path === '/workers/:id/permanent' && layer.route.methods.delete);
  assert.ok(authIndex >= 0 && deleteIndex > authIndex);
});
