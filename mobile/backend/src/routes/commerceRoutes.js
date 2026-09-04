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
module.exports = router;
