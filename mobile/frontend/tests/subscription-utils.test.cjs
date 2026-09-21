const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

// Load the production helpers (type-only imports are erased by the transpile).
const { outputText } = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/subscription.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
vm.runInNewContext(outputText, { module: loaded, exports: loaded.exports, Date, Math, Boolean });
const { formatPlanDate, formatQuota, isSubscriptionActive, subscriptionDaysLeft, subscriptionPlanId, subscriptionPlanName } = loaded.exports;

const DAY = 86_400_000;
const subscription = (overrides = {}) => ({
  _id: 's1',
  status: 'active',
  startsAt: new Date(Date.now() - DAY).toISOString(),
  endsAt: new Date(Date.now() + 10 * DAY).toISOString(),
  plan: { _id: 'plan-growth', name: 'Growth', code: 'GROWTH', price: 299 },
  ...overrides,
});

test('the current plan is identified by id and name whether the backend populated it or not', () => {
  assert.equal(subscriptionPlanId(subscription()), 'plan-growth');
  assert.equal(subscriptionPlanName(subscription()), 'Growth');
  // Bare id (not populated): still matchable, but there is no name to show.
  assert.equal(subscriptionPlanId(subscription({ plan: 'plan-pro' })), 'plan-pro');
  assert.equal(subscriptionPlanName(subscription({ plan: 'plan-pro' })), undefined);
  for (const empty of [null, undefined]) {
    assert.equal(subscriptionPlanId(empty), undefined);
    assert.equal(subscriptionPlanName(empty), undefined);
  }
});

test('only an active, unexpired subscription counts as the current plan', () => {
  assert.equal(isSubscriptionActive(subscription()), true);
  assert.equal(isSubscriptionActive(subscription({ status: 'expired' })), false);
  assert.equal(isSubscriptionActive(subscription({ status: 'cancelled' })), false);
  assert.equal(isSubscriptionActive(subscription({ endsAt: new Date(Date.now() - 1000).toISOString() })), false);
  assert.equal(isSubscriptionActive(null), false);
  assert.equal(isSubscriptionActive(undefined), false);
});

test('days left rounds up so the last partial day still counts, and never goes negative', () => {
  assert.equal(subscriptionDaysLeft(subscription({ endsAt: new Date(Date.now() + 3 * DAY - 3_600_000).toISOString() })), 3);
  assert.equal(subscriptionDaysLeft(subscription({ endsAt: new Date(Date.now() + 29 * DAY + 5_000).toISOString() })), 30);
  assert.equal(subscriptionDaysLeft(subscription({ endsAt: new Date(Date.now() + 60_000).toISOString() })), 1);
  assert.equal(subscriptionDaysLeft(subscription({ endsAt: new Date(Date.now() - 5 * DAY).toISOString() })), 0);
});

test('quota usage reads naturally, including unlimited plans', () => {
  assert.equal(formatQuota(2, 10), '2 of 10 used');
  assert.equal(formatQuota(0, 3), '0 of 3 used');
  assert.equal(formatQuota(5, -1), '5 used · Unlimited');
});

test('the validity date is shown as day, short month and year', () => {
  assert.match(formatPlanDate('2026-10-21T12:00:00.000Z'), /21 Oct 2026/);
});
