const express = require('express');
const controller = require('../controllers/templateStickerController');

const router = express.Router();
router.get('/', controller.listStickers);

module.exports = router;
