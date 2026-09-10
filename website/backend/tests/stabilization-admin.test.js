const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { listReportsSchema } = require('../src/validators/report.validator');
const hyperlocalSchemas = require('../src/validators/hyperlocal.validator');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('reports accept every target type written by the mobile API', () => {
  for (const targetType of ['job', 'user', 'business', 'offer', 'service_booking']) {
    assert.equal(listReportsSchema.validate({ body: {}, query: { targetType }, params: {} }).error, undefined);
  }
  const controller = read('backend/src/controllers/reportController.js');
  assert.match(controller, /attachTargets/);
  assert.match(controller, /target: targetsByType/);
});

test('analytics combines actual legacy transactions and hyperlocal payments', () => {
  const source = read('backend/src/controllers/dashboardController.js');
  assert.match(source, /Transaction\.aggregate/);
  assert.match(source, /Payment\.aggregate/);
  assert.match(source, /platformCommissionRate/);
  assert.match(source, /inclusiveDateTo\.setUTCHours\(23, 59, 59, 999\)/);
  assert.match(source, /type: \{ \$in: \['subscription', 'service'\] \}/);
});

test('admin hard delete is authenticated, offer-scoped, and clears dependents', () => {
  const routes = read('backend/src/routes/hyperlocalRoutes.js');
  const controller = read('backend/src/controllers/hyperlocalController.js');
  assert.ok(routes.indexOf('router.use(requireAdminAuth)') < routes.indexOf("router.delete('/offers/:id'"));
  assert.match(controller, /Offer\.findById\(req\.params\.id\)/);
  assert.match(controller, /\$pull: \{ savedOffers: offer\._id \}/);
  assert.match(controller, /Report\.deleteMany\(\{ targetType: 'offer', targetId: offer\._id \}\)/);
  assert.equal(hyperlocalSchemas.deleteById.validate({ body: {}, query: {}, params: { id: '507f1f77bcf86cd799439011' } }).error, undefined);
});

test('city/category deactivation stays separate from dependency-safe hard delete', () => {
  const controller = read('backend/src/controllers/hyperlocalController.js');
  const cities = read('admin-frontend/src/pages/hyperlocal/CitiesPage.tsx');
  const categories = read('admin-frontend/src/pages/hyperlocal/ServiceCategoriesPage.tsx');
  assert.match(cities, /Deactivate/);
  assert.match(categories, /Deactivate/);
  assert.match(controller, /CITY_HAS_DEPENDENCIES/);
  assert.match(controller, /CATEGORY_HAS_DEPENDENCIES/);
});

test('business hard delete is authenticated and blocked while dependent records exist', () => {
  const routes = read('backend/src/routes/hyperlocalRoutes.js');
  const controller = read('backend/src/controllers/hyperlocalController.js');
  const page = read('admin-frontend/src/pages/hyperlocal/BusinessesPage.tsx');
  assert.ok(routes.indexOf('router.use(requireAdminAuth)') < routes.indexOf("router.delete('/businesses/:id'"));
  assert.match(controller, /BUSINESS_HAS_DEPENDENCIES/);
  assert.match(controller, /Report\.deleteMany\(\{ targetType: 'business', targetId: business\._id \}\)/);
  assert.match(page, /Soft Delete/);
  assert.match(page, /Hard Delete/);
});
