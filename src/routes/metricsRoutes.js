// Metrics Routes
// Admin-only endpoints for aggregated signal metrics

const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { requireAdmin } = require('../middleware/requireAdmin');

// All metrics routes require admin authentication
router.use(requireAdmin);

/**
 * @swagger
 * /api/metrics/signal-types:
 *   get:
 *     summary: List allowed signal types (admin only)
 *     tags: [Metrics]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200: { description: List of signal types }
 *       401: { description: Missing or invalid admin credentials }
 *       403: { description: Admin role required }
 */
router.get('/signal-types', metricsController.getSignalTypes);

/**
 * @swagger
 * /api/metrics/stats:
 *   get:
 *     summary: Get aggregated signal stats (admin only)
 *     tags: [Metrics]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: window
 *         schema: { type: string, enum: [day, week] }
 *         description: Aggregation window
 *     responses:
 *       200: { description: Aggregated stats by window and type }
 *       400: { description: Invalid window parameter }
 *       401: { description: Missing or invalid admin credentials }
 *       403: { description: Admin role required }
 */
router.get('/stats', metricsController.getStats);

module.exports = router;
