const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');

/**
 * @swagger
 * /api/signals:
 *   post:
 *     summary: Submit a new integrity signal
 *     tags: [Signals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 description: Signal type key
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: ISO-8601 timestamp
 *               context:
 *                 type: object
 *                 properties:
 *                   eventId:
 *                     type: string
 *                   note:
 *                     type: string
 *     responses:
 *       201:
 *         description: Signal submitted successfully
 *       400:
 *         description: Validation error
 */
router.post('/', metricsController.submitSignal);

module.exports = router;
