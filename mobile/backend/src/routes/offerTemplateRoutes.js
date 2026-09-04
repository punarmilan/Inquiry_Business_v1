const express = require('express');
const controller = require('../controllers/offerTemplateController');
const validate = require('../middleware/validate');
const { offerTemplateIdSchema, offerTemplateListSchema } = require('../validators/hyperlocal.validator');

const router = express.Router();
router.get('/', validate(offerTemplateListSchema), controller.listTemplates);
router.get('/:id', validate(offerTemplateIdSchema), controller.getTemplate);

module.exports = router;
