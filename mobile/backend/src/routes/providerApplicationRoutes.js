const express = require('express');
const controller = require('../controllers/providerApplicationController');
const validate = require('../middleware/validate');
const { providerApplicationSchema } = require('../validators/providerApplication.validator');

const router = express.Router();
router.post('/', validate(providerApplicationSchema), controller.createProviderApplication);

module.exports = router;
