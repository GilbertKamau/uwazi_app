// Report Routes
// API endpoints for Report operations

const express = require('express');
const multer = require('multer');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Multer: memory storage (no disk writes on Railway)
// Accept up to 10 files, max 10MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    // Allow images, videos, PDFs, and common document types
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported`), false);
    }
  }
});

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
 *     summary: Create a new report with optional file uploads
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - description
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
 *               authorId:
 *                 type: string
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Upload up to 10 files (images, videos, PDFs)
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Validation error
 */
// POST - Create a new report (multipart/form-data with file uploads)
router.post('/', upload.array('evidence', 10), reportController.createReport);

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
 *     summary: Update a report with optional new file uploads
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
 *         multipart/form-data:
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
 *               existingEvidence:
 *                 type: string
 *                 description: JSON array of existing evidence URLs to keep
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: New files to upload
 *     responses:
 *       200:
 *         description: Report updated successfully
 *       404:
 *         description: Report not found
 */
// PUT - Update a report (multipart/form-data with file uploads)
router.put('/:id', upload.array('evidence', 10), reportController.updateReport);

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

// Error handler for multer file-type / size errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message && err.message.includes('File type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
