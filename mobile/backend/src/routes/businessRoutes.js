const express = require('express');
const controller = require('../controllers/businessController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { createBusinessSchema, updateBusinessSchema, offerIdSchema } = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/mine', requireAuth, controller.listMine);
router.post('/', requireAuth, validate(createBusinessSchema), controller.createBusiness);
router.put('/:id', requireAuth, validate(updateBusinessSchema), controller.updateBusiness);
router.get('/:id', validate(offerIdSchema), controller.getBusiness);
module.exports = router;
