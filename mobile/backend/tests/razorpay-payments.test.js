const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const razorpay = require('../src/services/razorpayService');
const { createPaymentOrderSchema } = require('../src/validators/hyperlocal.validator');
const settlement = require('../src/services/paymentSettlementService');
const commerce = require('../src/controllers/commerceController');
const { createCheckoutToken, verifyCheckoutToken } = require('../src/utils/checkoutToken');
const Payment = require('../src/models/Payment');
const Subscription = require('../src/models/Subscription');
const Notification = require('../src/models/Notification');
const Plan = require('../src/models/Plan');
const Business = require('../src/models/Business');
const User = require('../src/models/User');

const config = { keyId: 'rzp_test_key', keySecret: 'test-secret-value' };
const PAYMENT_ID = '507f1f77bcf86cd799439011';

const silenceErrors = (t) => t.mock.method(console, 'error', () => {});

// ---------------------------------------------------------------- razorpayService

test('toPaise converts rupees to integer paise without float drift', () => {
  assert.equal(razorpay.toPaise(499), 49900);
  assert.equal(razorpay.toPaise(19.99), 1999);
  assert.equal(razorpay.toPaise('99.5'), 9950);
});

test('verifyPaymentSignature accepts only the HMAC Razorpay would produce', () => {
  const sign = (orderId, paymentId, secret = config.keySecret) => crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const good = sign('order_A', 'pay_1');

  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_1', signature: good }, config), true);
  // A different payment or order id cannot reuse the signature.
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_2', signature: good }, config), false);
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_B', paymentId: 'pay_1', signature: good }, config), false);
  // Signed with someone else's secret, wrong length, wrong type, missing secret.
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_1', signature: sign('order_A', 'pay_1', 'other') }, config), false);
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_1', signature: good.slice(0, 10) }, config), false);
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_1', signature: undefined }, config), false);
  assert.equal(razorpay.verifyPaymentSignature({ orderId: 'order_A', paymentId: 'pay_1', signature: good }, { keyId: 'k', keySecret: '' }), false);
});

test('createOrder posts the amount in paise with basic auth and returns the order', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ id: 'order_A', amount: 49900, currency: 'INR' }) };
  };
  const order = await razorpay.createOrder({ amountPaise: 49900, receipt: 'SUB-1', notes: { planCode: 'PRO' } }, { config, fetchImpl });

  assert.equal(order.id, 'order_A');
  assert.equal(calls[0].url, 'https://api.razorpay.com/v1/orders');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(Buffer.from(calls[0].options.headers.Authorization.slice(6), 'base64').toString('utf8'), 'rzp_test_key:test-secret-value');
  assert.deepEqual(JSON.parse(calls[0].options.body), { amount: 49900, currency: 'INR', receipt: 'SUB-1', notes: { planCode: 'PRO' } });
});

test('gateway calls fail closed when unconfigured and map gateway errors to 502', async (t) => {
  silenceErrors(t);
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) }; };
  await assert.rejects(
    razorpay.createOrder({ amountPaise: 100, receipt: 'r' }, { config: { keyId: '', keySecret: '' }, fetchImpl }),
    (error) => error.statusCode === 503 && error.code === 'RAZORPAY_NOT_CONFIGURED'
  );
  assert.equal(called, false);

  const rejected = async () => ({ ok: false, status: 400, json: async () => ({ error: { description: 'Authentication failed' } }) });
  await assert.rejects(razorpay.fetchPayment('pay_1', { config, fetchImpl: rejected }), (error) => error.statusCode === 502 && error.code === 'RAZORPAY_REQUEST_FAILED');

  const unreachable = async () => { throw new Error('ECONNRESET'); };
  await assert.rejects(razorpay.fetchOrderPayments('order_A', { config, fetchImpl: unreachable }), (error) => error.statusCode === 502 && error.code === 'RAZORPAY_UNAVAILABLE');
});

// ---------------------------------------------------------------- checkout token

test('checkout token is bound to its payment, expires, and cannot be forged', () => {
  const now = 1_700_000_000_000;
  const token = createCheckoutToken('pay-1', now);
  assert.equal(verifyCheckoutToken('pay-1', token, now + 60_000), true);
  assert.equal(verifyCheckoutToken('pay-2', token, now + 60_000), false);
  assert.equal(verifyCheckoutToken('pay-1', token, now + 31 * 60_000), false);

  const [expiresAt, signature] = token.split('.');
  assert.equal(verifyCheckoutToken('pay-1', `${Number(expiresAt) + 3_600_000}.${signature}`, now), false);
  assert.equal(verifyCheckoutToken('pay-1', `${expiresAt}.${signature.slice(0, -1)}0`, now), false);
  for (const junk of [undefined, '', 'abc', '.', '123.', 'x.y', 42]) assert.equal(verifyCheckoutToken('pay-1', junk, now), false);
});

// ---------------------------------------------------------------- settlement

const basePayment = (overrides = {}) => ({
  _id: 'p1', type: 'subscription', provider: 'razorpay', providerOrderId: 'order_A', status: 'created', amount: 499,
  user: 'u1', business: 'b1', plan: 'pl1',
  planSnapshot: { name: 'Pro', durationDays: 30, offerPostingLimit: 10, maximumActiveOffers: 5, featuredOfferAllowance: 1, imagesPerOffer: 4 },
  ...overrides,
});
const gatewayPayment = (overrides = {}) => ({ id: 'pay_1', order_id: 'order_A', currency: 'INR', amount: 49900, status: 'captured', ...overrides });

const fakeGateway = ({ attempts = [gatewayPayment()], refetched, captureFails = false } = {}) => {
  const calls = { orderPayments: 0, fetched: [], captured: [] };
  return {
    calls,
    toPaise: razorpay.toPaise,
    fetchOrderPayments: async () => { calls.orderPayments += 1; return { items: attempts }; },
    fetchPayment: async (id) => { calls.fetched.push(id); return refetched ?? attempts.find((attempt) => attempt.id === id) ?? gatewayPayment({ id }); },
    capturePayment: async (id, amount) => { calls.captured.push([id, amount]); if (captureFails) throw new Error('already captured'); return {}; },
  };
};

const stubDb = (t, { subscriptionLookups = [null], claimResult = 'claimed' } = {}) => {
  const db = { claims: [], created: [], cancelled: [], notifications: [] };
  const lookups = [...subscriptionLookups];
  t.mock.method(Subscription, 'findOne', async () => (lookups.length > 1 ? lookups.shift() : lookups[0]));
  t.mock.method(Subscription, 'updateMany', async (filter, update) => { db.cancelled.push({ filter, update }); return {}; });
  t.mock.method(Subscription, 'create', async (doc) => { db.created.push(doc); return { _id: 'sub1', ...doc }; });
  t.mock.method(Payment, 'findOneAndUpdate', async (filter, update) => {
    db.claims.push({ filter, update });
    return claimResult === 'claimed' ? basePayment({ status: 'verified', providerPaymentId: update.$set.providerPaymentId }) : null;
  });
  t.mock.method(Payment, 'findById', async () => basePayment({ status: 'verified' }));
  t.mock.method(Notification, 'create', async (doc) => { db.notifications.push(doc); return doc; });
  return db;
};

test('settle refuses payments that are not online payments', async (t) => {
  stubDb(t);
  await assert.rejects(
    settlement.settleRazorpayPayment(basePayment({ provider: 'manual', providerOrderId: '' }), { razorpay: fakeGateway() }),
    (error) => error.statusCode === 409 && error.code === 'PAYMENT_NOT_ONLINE'
  );
});

test('settle activates the plan once Razorpay reports the order captured', async (t) => {
  const db = stubDb(t);
  const gateway = fakeGateway();
  const before = Date.now();
  const result = await settlement.settleRazorpayPayment(basePayment(), { razorpay: gateway });

  assert.equal(result.settled, true);
  assert.equal(gateway.calls.orderPayments, 1);
  assert.deepEqual(gateway.calls.captured, []);
  // Atomic claim from a payable state, recording Razorpay's payment id.
  assert.deepEqual(db.claims[0].filter.status.$in, ['created', 'pending_verification']);
  assert.equal(db.claims[0].update.$set.status, 'verified');
  assert.equal(db.claims[0].update.$set.providerPaymentId, 'pay_1');
  // Subscription carries the quota that was snapshotted at purchase time.
  assert.equal(db.created.length, 1);
  assert.deepEqual(db.created[0].quota, { offerPostingLimit: 10, maximumActiveOffers: 5, featuredOfferAllowance: 1, imagesPerOffer: 4 });
  assert.equal(db.created[0].owner, 'u1');
  const days = (db.created[0].endsAt - db.created[0].startsAt) / 86_400_000;
  assert.ok(Math.abs(days - 30) < 0.01);
  assert.ok(db.created[0].startsAt.getTime() >= before);
  // The plan being replaced is cancelled, but never this payment's own subscription.
  assert.deepEqual(db.cancelled[0].filter, { business: 'b1', status: 'active', payment: { $ne: 'p1' } });
  assert.equal(db.notifications.length, 1);
  assert.equal(db.notifications[0].type, 'payment_update');
});

test('settle does nothing when no attempt matches the order, amount and currency', async (t) => {
  const db = stubDb(t);
  const attempts = [
    gatewayPayment({ status: 'failed' }),
    gatewayPayment({ status: 'created' }),
    gatewayPayment({ amount: 49800 }),
    gatewayPayment({ order_id: 'order_OTHER' }),
    gatewayPayment({ currency: 'USD' }),
  ];
  const result = await settlement.settleRazorpayPayment(basePayment(), { razorpay: fakeGateway({ attempts }) });

  assert.equal(result.settled, false);
  assert.equal(db.claims.length, 0);
  assert.equal(db.created.length, 0);
  assert.equal(db.notifications.length, 0);
});

test('settle captures an authorized payment before activating', async (t) => {
  const db = stubDb(t);
  const gateway = fakeGateway({ attempts: [gatewayPayment({ status: 'authorized' })] });
  const result = await settlement.settleRazorpayPayment(basePayment(), { razorpay: gateway });

  assert.equal(result.settled, true);
  assert.deepEqual(gateway.calls.captured, [['pay_1', 49900]]);
  assert.equal(db.created.length, 1);
});

test('settle tolerates auto-capture winning the race, but not a capture that really failed', async (t) => {
  stubDb(t);
  const raced = fakeGateway({ attempts: [gatewayPayment({ status: 'authorized' })], captureFails: true, refetched: gatewayPayment({ status: 'captured' }) });
  assert.equal((await settlement.settleRazorpayPayment(basePayment(), { razorpay: raced })).settled, true);

  const db = stubDb(t);
  const failed = fakeGateway({ attempts: [gatewayPayment({ status: 'authorized' })], captureFails: true, refetched: gatewayPayment({ status: 'authorized' }) });
  await assert.rejects(settlement.settleRazorpayPayment(basePayment(), { razorpay: failed }), /already captured/);
  assert.equal(db.claims.length, 0);
});

test('settle checks only the named payment when the callback supplies it', async (t) => {
  stubDb(t);
  const gateway = fakeGateway();
  await settlement.settleRazorpayPayment(basePayment(), { razorpayPaymentId: 'pay_1', razorpay: gateway });
  assert.deepEqual(gateway.calls.fetched, ['pay_1']);
  assert.equal(gateway.calls.orderPayments, 0);
});

test('settle is idempotent: a verified payment is not re-charged, re-cancelled or re-announced', async (t) => {
  const db = stubDb(t, { subscriptionLookups: [{ _id: 'sub1' }] });
  const gateway = fakeGateway();
  const result = await settlement.settleRazorpayPayment(basePayment({ status: 'verified' }), { razorpay: gateway });

  assert.equal(result.settled, true);
  assert.equal(result.subscription._id, 'sub1');
  assert.equal(gateway.calls.orderPayments + gateway.calls.fetched.length, 0);
  assert.equal(db.claims.length + db.created.length + db.cancelled.length + db.notifications.length, 0);
});

test('settle finishes activation for a payment verified before its subscription was created', async (t) => {
  const db = stubDb(t, { subscriptionLookups: [null] });
  const result = await settlement.settleRazorpayPayment(basePayment({ status: 'verified' }), { razorpay: fakeGateway() });
  assert.equal(result.settled, true);
  assert.equal(db.created.length, 1);
});

test('settle loses a race cleanly: no duplicate announcement, plan still active', async (t) => {
  const db = stubDb(t, { claimResult: 'lost', subscriptionLookups: [{ _id: 'sub1' }] });
  const result = await settlement.settleRazorpayPayment(basePayment(), { razorpay: fakeGateway() });
  assert.equal(result.settled, true);
  assert.equal(db.notifications.length, 0);
  assert.equal(db.created.length, 0);
});

test('settle returns the existing subscription when a concurrent settle created it first', async (t) => {
  const db = stubDb(t, { subscriptionLookups: [null, { _id: 'winner' }] });
  t.mock.method(Subscription, 'create', async () => { throw Object.assign(new Error('E11000'), { code: 11000 }); });
  const result = await settlement.settleRazorpayPayment(basePayment(), { razorpay: fakeGateway() });
  assert.equal(result.subscription._id, 'winner');
  assert.equal(db.claims.length, 1);
});

test('settle leaves failed or refunded payments alone', async (t) => {
  const db = stubDb(t);
  for (const status of ['failed', 'refunded']) {
    const gateway = fakeGateway();
    const result = await settlement.settleRazorpayPayment(basePayment({ status }), { razorpay: gateway });
    assert.equal(result.settled, false);
    assert.equal(gateway.calls.orderPayments, 0);
  }
  assert.equal(db.claims.length, 0);
});

// ---------------------------------------------------------------- controller

const fakeRes = () => {
  const res = { statusCode: 200, headers: {}, removed: [], body: undefined, done: () => {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.set = (name, value) => { res.headers[name.toLowerCase()] = value; return res; };
  res.removeHeader = (name) => { res.removed.push(name.toLowerCase()); return res; };
  res.type = () => res;
  res.json = (payload) => { res.body = payload; res.done(); return res; };
  res.send = (payload) => { res.body = payload; res.done(); return res; };
  return res;
};
const invoke = (handler, req) => new Promise((resolve, reject) => {
  const res = fakeRes();
  res.done = () => resolve(res);
  handler({ params: {}, query: {}, body: {}, ...req }, res, reject);
});

// `reusable` is what the "is there already an open order for this purchase?" lookup finds.
// `created.reuseLookups` records those lookups; `created` itself lists new payments.
const stubOrderLookups = (t, { price = 499, reusable = null } = {}) => {
  t.mock.method(Plan, 'findOne', async () => ({
    _id: 'pl1', name: 'Pro', code: 'PRO', price, durationDays: 30, offerPostingLimit: 10, maximumActiveOffers: 5, featuredOfferAllowance: 1, imagesPerOffer: 4,
  }));
  t.mock.method(Business, 'findOne', async () => ({ _id: 'b1' }));
  const created = [];
  created.reuseLookups = [];
  t.mock.method(Payment, 'findOneAndUpdate', async (filter, update, options) => { created.reuseLookups.push({ filter, update, options }); return reusable; });
  t.mock.method(Payment, 'create', async (doc) => { created.push(doc); return { _id: PAYMENT_ID, ...doc }; });
  return created;
};
const orderRequest = () => ({ user: { _id: 'u1' }, body: { planId: 'pl1', businessId: 'b1' } });

test('plan order: pays online, prices from the plan, and hands the app a signed checkout link', async (t) => {
  const created = stubOrderLookups(t, { price: 499 });
  const orders = [];
  t.mock.method(razorpay, 'isConfigured', () => true);
  t.mock.method(razorpay, 'createOrder', async (args) => { orders.push(args); return { id: 'order_X' }; });

  const res = await invoke(commerce.createSubscriptionOrder, { ...orderRequest(), body: { planId: 'pl1', businessId: 'b1', amount: 1 } });

  assert.equal(res.statusCode, 201);
  assert.equal(orders[0].amountPaise, 49900);
  assert.equal(orders[0].receipt, created[0].orderId);
  assert.equal(created[0].provider, 'razorpay');
  assert.equal(created[0].providerOrderId, 'order_X');
  assert.equal(created[0].status, 'created');
  assert.equal(created[0].amount, 499);
  const match = /^\/payments\/([0-9a-f]{24})\/razorpay-checkout\?token=(\d+\.[0-9a-f]{64})$/.exec(res.body.checkout.path);
  assert.ok(match, res.body.checkout.path);
  assert.equal(match[1], PAYMENT_ID);
  assert.equal(verifyCheckoutToken(PAYMENT_ID, match[2]), true);
});

test('plan order: keeps the manual admin-verified flow when Razorpay is not configured or the plan is free', async (t) => {
  const created = stubOrderLookups(t, { price: 499 });
  const createOrder = t.mock.method(razorpay, 'createOrder', async () => ({ id: 'order_X' }));
  const configured = t.mock.method(razorpay, 'isConfigured', () => false);

  const manual = await invoke(commerce.createSubscriptionOrder, orderRequest());
  assert.equal(created[0].provider, 'manual');
  assert.equal(created[0].status, 'pending_verification');
  assert.equal(manual.body.checkout, undefined);
  assert.equal(manual.body.paymentInstructions.mode, 'server_verified');

  configured.mock.mockImplementation(() => true);
  t.mock.method(Plan, 'findOne', async () => ({ _id: 'pl1', name: 'Free', code: 'FREE', price: 0, durationDays: 30 }));
  await invoke(commerce.createSubscriptionOrder, orderRequest());
  assert.equal(created[1].provider, 'manual');
  assert.equal(createOrder.mock.callCount(), 0);
});

test('plan order: a gateway failure creates no payment record', async (t) => {
  silenceErrors(t);
  const created = stubOrderLookups(t);
  t.mock.method(razorpay, 'isConfigured', () => true);
  t.mock.method(razorpay, 'createOrder', async () => { throw Object.assign(new Error('gateway'), { statusCode: 502 }); });
  await assert.rejects(invoke(commerce.createSubscriptionOrder, orderRequest()), /gateway/);
  assert.equal(created.length, 0);
});

const onlinePayment = (overrides = {}) => basePayment({ _id: PAYMENT_ID, orderId: 'SUB-1', status: 'created', ...overrides });
const withCheckoutUser = (t) => t.mock.method(User, 'findById', () => ({ select: async () => ({ name: 'Asha', phone: '+917225962334', email: '' }) }));

test('plan order request accepts only the payment methods the app offers', () => {
  const body = { planId: '507f1f77bcf86cd799439011', businessId: '507f1f77bcf86cd799439012' };
  assert.deepEqual(razorpay.PAYMENT_METHODS, ['upi', 'card', 'netbanking']);
  assert.equal(createPaymentOrderSchema.validate({ body }).error, undefined);
  for (const method of razorpay.PAYMENT_METHODS) assert.equal(createPaymentOrderSchema.validate({ body: { ...body, method } }).error, undefined, method);
  for (const method of ['wallet', 'emi', 'UPI', '', 'cash']) assert.ok(createPaymentOrderSchema.validate({ body: { ...body, method } }).error, `"${method}" must be rejected`);
});

test('plan order: records the method the user picked so checkout can show only that one', async (t) => {
  const created = stubOrderLookups(t);
  t.mock.method(razorpay, 'isConfigured', () => true);
  t.mock.method(razorpay, 'createOrder', async () => ({ id: 'order_X' }));

  await invoke(commerce.createSubscriptionOrder, { ...orderRequest(), body: { planId: 'pl1', businessId: 'b1', method: 'upi' } });
  await invoke(commerce.createSubscriptionOrder, orderRequest());

  assert.deepEqual(created[0].metadata, { preferredMethod: 'upi' });
  assert.deepEqual(created[1].metadata, {});
});

test('plan order: retrying with another method reuses the open order instead of stacking duplicates', async (t) => {
  const created = stubOrderLookups(t, { reusable: onlinePayment({ metadata: { preferredMethod: 'card' } }) });
  t.mock.method(razorpay, 'isConfigured', () => true);
  const createOrder = t.mock.method(razorpay, 'createOrder', async () => ({ id: 'order_NEW' }));
  const before = Date.now();

  const res = await invoke(commerce.createSubscriptionOrder, { ...orderRequest(), body: { planId: 'pl1', businessId: 'b1', method: 'card' } });

  assert.equal(res.statusCode, 200);
  assert.equal(createOrder.mock.callCount(), 0);
  assert.equal(created.length, 0);
  assert.equal(res.body.payment._id, PAYMENT_ID);
  const token = /token=(\S+)$/.exec(res.body.checkout.path)[1];
  assert.equal(verifyCheckoutToken(PAYMENT_ID, token), true);

  // Only this user's own, still-unpaid, still-fresh order for the same plan, business and price qualifies.
  const { filter, update, options } = created.reuseLookups[0];
  assert.equal(filter.user, 'u1');
  assert.equal(filter.business, 'b1');
  assert.equal(filter.plan, 'pl1');
  assert.equal(filter.provider, 'razorpay');
  assert.equal(filter.status, 'created');
  assert.equal(filter.amount, 499);
  assert.ok(filter.createdAt.$gte instanceof Date);
  assert.ok(Math.abs(before - filter.createdAt.$gte.getTime() - 30 * 60 * 1000) < 5_000);
  assert.deepEqual(update, { $set: { 'metadata.preferredMethod': 'card' } });
  assert.deepEqual(options, { new: true, sort: { createdAt: -1 } });

  // Retrying without naming a method clears the earlier choice rather than keeping it.
  await invoke(commerce.createSubscriptionOrder, orderRequest());
  assert.deepEqual(created.reuseLookups[1].update, { $unset: { 'metadata.preferredMethod': '' } });
});

test('checkout page shows only the method the user chose in the app', async (t) => {
  withCheckoutUser(t);
  const lookup = t.mock.method(Payment, 'findOne', async () => onlinePayment());
  const render = async (metadata) => {
    lookup.mock.mockImplementation(async () => onlinePayment({ metadata }));
    const res = await invoke(commerce.razorpayCheckoutPage, { params: { id: PAYMENT_ID }, query: { token: createCheckoutToken(PAYMENT_ID) } });
    return { html: res.body, cfg: JSON.parse(/var cfg = (\{.*\});/.exec(res.body)[1]) };
  };

  for (const [method, label] of [['upi', 'UPI'], ['card', 'Card'], ['netbanking', 'Netbanking']]) {
    const { html, cfg } = await render({ preferredMethod: method });
    assert.deepEqual(cfg.config, {
      display: {
        blocks: { [`only_${method}`]: { name: `Pay via ${label}`, instruments: [{ method }] } },
        sequence: [`block.only_${method}`],
        preferences: { show_default_blocks: false },
      },
    });
    assert.match(html, new RegExp(`Pay with ${label}`));
    assert.match(html, /config: cfg\.config/);
  }

  // No choice (or anything unexpected) leaves Razorpay's normal all-methods checkout.
  for (const metadata of [{}, { preferredMethod: 'wallet' }, undefined]) {
    const { html, cfg } = await render(metadata);
    assert.equal('config' in cfg, false);
    assert.match(html, /Pay securely/);
  }
});

test('checkout page rejects a bad or expired link without touching the payment', async (t) => {
  const lookup = t.mock.method(Payment, 'findOne', async () => onlinePayment());
  const forged = await invoke(commerce.razorpayCheckoutPage, { params: { id: PAYMENT_ID }, query: { token: '9999999999999.deadbeef' } });
  const missing = await invoke(commerce.razorpayCheckoutPage, { params: { id: PAYMENT_ID }, query: {} });
  const badId = await invoke(commerce.razorpayCheckoutPage, { params: { id: 'nope' }, query: { token: createCheckoutToken('nope') } });

  for (const res of [forged, missing, badId]) {
    assert.equal(res.statusCode, 403);
    assert.match(res.body, /Payment link expired/);
  }
  assert.equal(lookup.mock.callCount(), 0);
});

test('checkout page renders Razorpay Checkout for an open order and escapes plan text', async (t) => {
  withCheckoutUser(t);
  t.mock.method(Payment, 'findOne', async () => onlinePayment({ planSnapshot: { ...basePayment().planSnapshot, name: '</script><img src=x onerror=alert(1)>' } }));
  const res = await invoke(commerce.razorpayCheckoutPage, { params: { id: PAYMENT_ID }, query: { token: createCheckoutToken(PAYMENT_ID) } });

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /https:\/\/checkout\.razorpay\.com\/v1\/checkout\.js/);
  assert.match(res.body, /order_A/);
  assert.match(res.body, new RegExp(`/payments/${PAYMENT_ID}/razorpay-callback`));
  assert.ok(!res.body.includes('</script><img'), 'plan name must not break out of the page');
  // Helmet's API-only CSP and same-origin opener policy would break Checkout.
  assert.ok(res.removed.includes('content-security-policy'));
  assert.ok(res.removed.includes('cross-origin-opener-policy'));
});

test('checkout page refuses an order that is already paid', async (t) => {
  withCheckoutUser(t);
  t.mock.method(Payment, 'findOne', async () => null);
  const res = await invoke(commerce.razorpayCheckoutPage, { params: { id: PAYMENT_ID }, query: { token: createCheckoutToken(PAYMENT_ID) } });
  assert.equal(res.statusCode, 404);
});

const callbackRequest = (body) => ({ params: { id: PAYMENT_ID }, body });
const signedBody = { razorpay_order_id: 'order_A', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' };

test('callback: a cancelled or failed payment changes nothing and tells the user', async (t) => {
  t.mock.method(Payment, 'findOne', async () => onlinePayment());
  const settle = t.mock.method(settlement, 'settleRazorpayPayment', async () => ({ settled: true }));
  const res = await invoke(commerce.razorpayCallback, callbackRequest({ error: { description: 'Card declined' } }));

  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Payment not completed/);
  assert.match(res.body, /Card declined/);
  assert.equal(settle.mock.callCount(), 0);
});

test('callback: an unverifiable signature or a mismatched order never activates anything', async (t) => {
  silenceErrors(t);
  t.mock.method(Payment, 'findOne', async () => onlinePayment());
  const settle = t.mock.method(settlement, 'settleRazorpayPayment', async () => ({ settled: true }));
  const verify = t.mock.method(razorpay, 'verifyPaymentSignature', () => false);

  const forged = await invoke(commerce.razorpayCallback, callbackRequest(signedBody));
  assert.equal(forged.statusCode, 400);
  assert.match(forged.body, /could not be verified/);

  // A genuinely signed payment for a different order must not settle this one.
  verify.mock.mockImplementation(() => true);
  const otherOrder = await invoke(commerce.razorpayCallback, callbackRequest({ ...signedBody, razorpay_order_id: 'order_OTHER' }));
  assert.equal(otherOrder.statusCode, 400);
  assert.equal(settle.mock.callCount(), 0);
});

test('callback: a verified payment is settled with Razorpay and reported as success', async (t) => {
  t.mock.method(Payment, 'findOne', async () => onlinePayment());
  const verify = t.mock.method(razorpay, 'verifyPaymentSignature', () => true);
  const settle = t.mock.method(settlement, 'settleRazorpayPayment', async () => ({ settled: true }));
  const res = await invoke(commerce.razorpayCallback, callbackRequest(signedBody));

  assert.deepEqual(verify.mock.calls[0].arguments[0], { orderId: 'order_A', paymentId: 'pay_1', signature: 'sig' });
  assert.equal(settle.mock.calls[0].arguments[1].razorpayPaymentId, 'pay_1');
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Payment successful/);
  assert.match(res.body, new RegExp(`inquiryexperts://payment-result\\?paymentId=${PAYMENT_ID}&amp;status=success`));
  // The strict page policy allows exactly the one inline script, via its nonce.
  const nonce = /script-src 'nonce-([^']+)'/.exec(res.headers['content-security-policy'])[1];
  assert.ok(res.body.includes(`<script nonce="${nonce}">`));
});

test('callback: if confirmation cannot finish now the user is told it is pending, not failed', async (t) => {
  silenceErrors(t);
  t.mock.method(Payment, 'findOne', async () => onlinePayment());
  t.mock.method(razorpay, 'verifyPaymentSignature', () => true);
  const settle = t.mock.method(settlement, 'settleRazorpayPayment', async () => { throw new Error('gateway down'); });

  const thrown = await invoke(commerce.razorpayCallback, callbackRequest(signedBody));
  assert.equal(thrown.statusCode, 200);
  assert.match(thrown.body, /Confirming your payment/);

  settle.mock.mockImplementation(async () => ({ settled: false }));
  const notYet = await invoke(commerce.razorpayCallback, callbackRequest(signedBody));
  assert.match(notYet.body, /Confirming your payment/);
});

test('callback: an unknown payment id gets a not-found page', async (t) => {
  t.mock.method(Payment, 'findOne', async () => null);
  const res = await invoke(commerce.razorpayCallback, callbackRequest(signedBody));
  assert.equal(res.statusCode, 404);
  const invalid = await invoke(commerce.razorpayCallback, { params: { id: 'not-an-id' }, body: signedBody });
  assert.equal(invalid.statusCode, 404);
});

test('sync: only the owner can sync, and it reports whether the plan activated', async (t) => {
  const lookup = t.mock.method(Payment, 'findOne', async () => null);
  await assert.rejects(invoke(commerce.syncPayment, { params: { id: PAYMENT_ID }, user: { _id: 'u1' } }), (error) => error.statusCode === 404);
  assert.deepEqual(lookup.mock.calls[0].arguments[0], { _id: PAYMENT_ID, user: 'u1' });

  lookup.mock.mockImplementation(async () => onlinePayment({ provider: 'manual' }));
  const manual = await invoke(commerce.syncPayment, { params: { id: PAYMENT_ID }, user: { _id: 'u1' } });
  assert.equal(manual.body.activated, false);

  lookup.mock.mockImplementation(async () => onlinePayment());
  const endsAt = new Date('2026-10-21T00:00:00.000Z');
  t.mock.method(settlement, 'settleRazorpayPayment', async (payment) => ({ payment: { ...payment, status: 'verified' }, subscription: { _id: 'sub1', endsAt }, settled: true }));
  const online = await invoke(commerce.syncPayment, { params: { id: PAYMENT_ID }, user: { _id: 'u1' } });
  assert.equal(online.body.activated, true);
  assert.equal(online.body.payment.status, 'verified');
  // The app shows "active until <date>" from this.
  assert.equal(online.body.subscription.endsAt, endsAt);
});
