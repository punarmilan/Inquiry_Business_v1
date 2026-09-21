const express = require('express');
const controller = require('../controllers/commerceController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { createPaymentOrderSchema, createServicePaymentOrderSchema, offerIdSchema } = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/plans', controller.listPlans);
router.get('/subscriptions/mine', requireAuth, controller.listMySubscriptions);
router.get('/payments/mine', requireAuth, controller.listMyPayments);
router.post('/payments/subscription-orders', requireAuth, validate(createPaymentOrderSchema), controller.createSubscriptionOrder);
router.post('/payments/service-orders', requireAuth, validate(createServicePaymentOrderSchema), controller.createServiceOrder);
router.post('/payments/:id/confirm', requireAuth, validate(offerIdSchema), controller.rejectClientVerification);
router.post('/payments/:id/sync', requireAuth, validate(offerIdSchema), controller.syncPayment);
// Browser leg of a Razorpay payment. Deliberately not behind requireAuth (the
// phone's browser has no app login) and not behind validate(), which would strip
// Razorpay's body fields; both check their own credentials (signed link / HMAC).
router.get('/payments/:id/razorpay-checkout', controller.razorpayCheckoutPage);
router.post('/payments/:id/razorpay-callback', controller.razorpayCallback);
module.exports = router;
