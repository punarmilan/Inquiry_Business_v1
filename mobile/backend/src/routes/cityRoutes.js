const express = require('express');
const controller = require('../controllers/cityController');
const validate = require('../middleware/validate');
const { pollingLimiter } = require('../middleware/rateLimiters');
const { listCitiesSchema, cityAvailabilitySchema } = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/', pollingLimiter, validate(listCitiesSchema), controller.listCities);
router.get('/availability', pollingLimiter, validate(cityAvailabilitySchema), controller.getAvailability);
module.exports = router;
