const express = require('express');
const controller = require('../controllers/cityController');
const validate = require('../middleware/validate');
const { listCitiesSchema, cityAvailabilitySchema } = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/', validate(listCitiesSchema), controller.listCities);
router.get('/availability', validate(cityAvailabilitySchema), controller.getAvailability);
module.exports = router;
