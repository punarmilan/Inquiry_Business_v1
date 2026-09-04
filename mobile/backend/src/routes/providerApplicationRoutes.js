const express = require('express');
const controller = require('../controllers/providerApplicationController');

const router = express.Router();
router.post('/', controller.createProviderApplication);

module.exports = router;
