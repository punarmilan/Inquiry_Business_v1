const express = require('express');
const controller = require('../controllers/uiController');
const schemas = require('../validators/ui.validator');

const router = express.Router();
router.get('/runtime', schemas.validate(schemas.runtime), controller.runtime);
router.get('/assets/:id', schemas.validate(schemas.assetRead), controller.asset);

module.exports = router;
