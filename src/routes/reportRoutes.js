// Report Routes
// API endpoints for Report operations

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// POST - Create a new report
router.post('/', reportController.createReport);

// GET - Get all reports
router.get('/', reportController.getAllReports);

// GET - Get a single report by ID
router.get('/:id', reportController.getReportById);

// PUT - Update a report
router.put('/:id', reportController.updateReport);

// DELETE - Delete a report
router.delete('/:id', reportController.deleteReport);

// PATCH - Update report status
router.patch('/:id/status', reportController.updateReportStatus);

module.exports = router;

