const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const validate = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { revenueSeriesSchema, statsSchema, performanceSchema, searchSchema } = require('../validators/dashboard.validator');

const router = express.Router();

router.use(requireAdminAuth);

router.get('/stats', validate(statsSchema), dashboardController.getStats);
router.get('/revenue', validate(revenueSeriesSchema), dashboardController.getRevenueSeries);
router.get('/performance', validate(performanceSchema), dashboardController.getPerformance);
router.get('/insights', dashboardController.getInsights);
router.get('/search', validate(searchSchema), dashboardController.search);

module.exports = router;
