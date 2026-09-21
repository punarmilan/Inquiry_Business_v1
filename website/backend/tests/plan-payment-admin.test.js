const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/controllers/hyperlocalController');
const schemas = require('../src/validators/hyperlocal.validator');
const Payment = require('../src/models/Payment');
const Plan = require('../src/models/Plan');
const Subscription = require('../src/models/Subscription');
const ServiceBooking = require('../src/models/ServiceBooking');
const Notification = require('../src/models/Notification');

const ID = '507f1f77bcf86cd799439011';

const invoke = (handler, req) => new Promise((resolve, reject) => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; resolve(res); return res; };
  handler({ params: { id: ID }, body: {}, admin: { _id: 'admin1' }, ...req }, res, reject);
});

// ---------------------------------------------------------------- validators

test('plans can be disabled or enabled with just isActive, and payments need a reason to be declined', () => {
  assert.equal(schemas.planUpdate.validate({ params: { id: ID }, body: { isActive: false } }).error, undefined);
  assert.equal(schemas.planUpdate.validate({ params: { id: ID }, body: { isActive: true } }).error, undefined);
  assert.ok(schemas.planUpdate.validate({ params: { id: ID }, body: {} }).error, 'an empty update must be rejected');

  assert.equal(schemas.declinePayment.validate({ params: { id: ID }, body: { reason: 'Never paid' } }).error, undefined);
  for (const reason of [undefined, '', '  ', 'no', 'x'.repeat(501)]) {
    assert.ok(schemas.declinePayment.validate({ params: { id: ID }, body: { reason } }).error, `reason ${JSON.stringify(reason)?.slice(0, 20)} must be rejected`);
  }
  assert.ok(schemas.declinePayment.validate({ params: { id: 'nope' }, body: { reason: 'Never paid' } }).error);
});

// ---------------------------------------------------------------- decline

const stubDecline = (t, { found = true, type = 'subscription' } = {}) => {
  const calls = { claim: [], bookings: [], notifications: [] };
  t.mock.method(Payment, 'findOneAndUpdate', async (filter, update, options) => {
    calls.claim.push({ filter, update, options });
    return found ? { _id: ID, orderId: 'SUB-1', type, user: 'u1', booking: type === 'service' ? 'bk1' : undefined, status: 'failed', failureReason: update.$set.failureReason } : null;
  });
  t.mock.method(ServiceBooking, 'updateOne', async (filter, update) => { calls.bookings.push({ filter, update }); return {}; });
  t.mock.method(Notification, 'create', async (doc) => { calls.notifications.push(doc); return doc; });
  return calls;
};

test('decline moves only a pending payment to failed, records the reason, and tells the customer', async (t) => {
  const calls = stubDecline(t);
  const res = await invoke(controller.declinePayment, { body: { reason: 'Never paid' } });

  assert.deepEqual(calls.claim[0].filter, { _id: ID, status: 'pending_verification' });
  assert.deepEqual(calls.claim[0].update, { $set: { status: 'failed', failureReason: 'Never paid' } });
  assert.equal(calls.claim[0].options.new, true);
  assert.equal(res.body.payment.status, 'failed');
  assert.equal(calls.bookings.length, 0);
  assert.equal(calls.notifications[0].user, 'u1');
  assert.equal(calls.notifications[0].type, 'payment_update');
  assert.match(calls.notifications[0].body, /SUB-1.*Never paid/);
});

test('decline cannot touch a payment that is not waiting for verification', async (t) => {
  const calls = stubDecline(t, { found: false });
  await assert.rejects(
    invoke(controller.declinePayment, { body: { reason: 'Never paid' } }),
    (error) => error.statusCode === 404 && error.code === 'PAYMENT_NOT_PENDING'
  );
  assert.equal(calls.notifications.length, 0);
});

test('declining a service payment releases the booking so the customer can pay again', async (t) => {
  const calls = stubDecline(t, { type: 'service' });
  await invoke(controller.declinePayment, { body: { reason: 'Not received' } });
  assert.deepEqual(calls.bookings[0].filter, { _id: 'bk1', paymentStatus: 'pending' });
  assert.deepEqual(calls.bookings[0].update, { $set: { paymentStatus: 'unpaid' } });
});

test('a long decline reason still fits the notification', async (t) => {
  const calls = stubDecline(t);
  await invoke(controller.declinePayment, { body: { reason: 'r'.repeat(500) } });
  assert.ok(calls.notifications[0].body.length <= 300);
});

// ---------------------------------------------------------------- delete payment

const stubPaymentDelete = (t, { payment, hasSubscription = false, deletedCount = 1 }) => {
  const deletes = [];
  t.mock.method(Payment, 'findById', async () => payment);
  t.mock.method(Subscription, 'exists', async () => (hasSubscription ? { _id: 'sub1' } : null));
  t.mock.method(Payment, 'deleteOne', async (filter) => { deletes.push(filter); return { deletedCount }; });
  return deletes;
};

test('only a failed payment can be deleted, and only that exact state is removed', async (t) => {
  const deletes = stubPaymentDelete(t, { payment: { _id: ID, status: 'failed' } });
  const res = await invoke(controller.deletePayment);
  assert.deepEqual(deletes, [{ _id: ID, status: 'failed' }]);
  assert.deepEqual(res.body, { success: true, payment: { _id: ID } });
});

test('money records are never deleted: pending, created, verified and refunded payments are refused', async (t) => {
  for (const status of ['pending_verification', 'created', 'verified', 'refunded']) {
    const deletes = stubPaymentDelete(t, { payment: { _id: ID, status } });
    await assert.rejects(invoke(controller.deletePayment), (error) => error.statusCode === 409 && error.code === 'PAYMENT_NOT_DELETABLE', status);
    assert.equal(deletes.length, 0, `${status} must not be deleted`);
  }
});

test('payment delete refuses a payment that has a subscription, an unknown id, and a state change mid-delete', async (t) => {
  const withSubscription = stubPaymentDelete(t, { payment: { _id: ID, status: 'failed' }, hasSubscription: true });
  await assert.rejects(invoke(controller.deletePayment), (error) => error.code === 'PAYMENT_NOT_DELETABLE');
  assert.equal(withSubscription.length, 0);

  stubPaymentDelete(t, { payment: null });
  await assert.rejects(invoke(controller.deletePayment), (error) => error.statusCode === 404 && error.code === 'PAYMENT_NOT_FOUND');

  stubPaymentDelete(t, { payment: { _id: ID, status: 'failed' }, deletedCount: 0 });
  await assert.rejects(invoke(controller.deletePayment), (error) => error.statusCode === 409);
});

// ---------------------------------------------------------------- delete plan

const stubPlanDelete = (t, { plan = 'exists', payments = 0, subscriptions = 0 } = {}) => {
  const state = { deleted: 0 };
  t.mock.method(Plan, 'findById', async () => (plan === 'exists' ? { _id: ID, name: 'Pro', deleteOne: async () => { state.deleted += 1; } } : null));
  t.mock.method(Payment, 'countDocuments', async () => payments);
  t.mock.method(Subscription, 'countDocuments', async () => subscriptions);
  return state;
};

test('a plan nobody has bought is permanently deleted', async (t) => {
  const state = stubPlanDelete(t);
  const res = await invoke(controller.deletePlan);
  assert.equal(state.deleted, 1);
  assert.equal(res.body.success, true);
});

test('a plan with payments or subscriptions cannot be deleted and the admin is told to disable it', async (t) => {
  for (const counts of [{ payments: 2 }, { subscriptions: 1 }, { payments: 3, subscriptions: 3 }]) {
    const state = stubPlanDelete(t, counts);
    await assert.rejects(
      invoke(controller.deletePlan),
      (error) => error.statusCode === 409 && error.code === 'PLAN_IN_USE' && /Disable it instead/.test(error.message)
    );
    assert.equal(state.deleted, 0);
  }
  stubPlanDelete(t, { payments: 2, subscriptions: 5 });
  await assert.rejects(invoke(controller.deletePlan), /2 payment\(s\) and 5 subscription\(s\)/);
});

test('deleting an unknown plan is a 404', async (t) => {
  stubPlanDelete(t, { plan: null });
  await assert.rejects(invoke(controller.deletePlan), (error) => error.statusCode === 404 && error.code === 'PLAN_NOT_FOUND');
});
