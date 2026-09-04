const express = require('express');
const { requireAuth } = require('../middleware/auth');

// Legacy collection and historical records are deliberately retained. The
// public marketplace surface is retired, so no consumer can create, apply to,
// or mutate a job through this endpoint anymore.
const router = express.Router();
router.use(requireAuth);
router.use((_req, res) =>
  res.status(410).json({
    success: false,
    error: {
      code: 'LEGACY_JOB_MARKETPLACE_RETIRED',
      message: 'Jobs and applications have been retired. Use offers or managed services instead.',
    },
  })
);

module.exports = router;
