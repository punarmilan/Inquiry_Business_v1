const express = require('express');
const controller = require('../controllers/offerController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const {
  nearbyOffersSchema, createOfferSchema, updateOfferSchema, offerIdSchema, offerDetailsSchema, analyticsSchema,
} = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/nearby', validate(nearbyOffersSchema), controller.nearbyOffers);
router.get('/mine', requireAuth, controller.listMine);
router.get('/saved', requireAuth, controller.listSaved);
router.post('/', requireAuth, validate(createOfferSchema), controller.createOffer);
router.put('/:id', requireAuth, validate(updateOfferSchema), controller.updateOffer);
router.delete('/:id', requireAuth, validate(offerIdSchema), controller.deleteOffer);
router.post('/:id/save', requireAuth, validate(offerIdSchema), controller.toggleSave);
router.post('/:id/analytics', validate(analyticsSchema), controller.recordAnalytics);
router.get('/:id', validate(offerDetailsSchema), controller.getOffer);
module.exports = router;
