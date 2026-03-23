// Report Routes
// API endpoints for Report operations

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Social justice report operations
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - county
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 description: e.g. Judiciary, Police
 *               county:
 *                 type: string
 *                 description: Kenya county name
 *               location:
 *                 type: string
 *               isAnonymous:
 *                 type: boolean
 *               authorName:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: URL to photo or video evidence
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Validation error
 */
// POST - Create a new report
router.post('/', reportController.createReport);

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: List of reports
 */
// GET - Get all reports
router.get('/', reportController.getAllReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a single report by ID
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */
// GET - Get a single report by ID
router.get('/:id', reportController.getReportById);

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Update a report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               county:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       404:
 *         description: Report not found
 */
// PUT - Update a report
router.put('/:id', reportController.updateReport);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       404:
 *         description: Report not found
 */
// DELETE - Delete a report
router.delete('/:id', reportController.deleteReport);

/**
 * @swagger
 * /api/reports/{id}/status:
 *   patch:
 *     summary: Update report status
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report status updated
 *       404:
 *         description: Report not found
 */
// PATCH - Update report status
router.patch('/:id/status', reportController.updateReportStatus);

module.exports = router;

