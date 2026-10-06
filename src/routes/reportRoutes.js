// Report Routes
//
//   GET    /api/reports            public feed (paginated, filterable)
//   GET    /api/reports/:id        public detail (author identity hidden unless staff)
//   POST   /api/reports            public - anonymous by default, strict rate limit
//   POST   /api/reports/:id/upvote public - rate limited
//   PUT    /api/reports/:id        reviewer/admin
//   PATCH  /api/reports/:id/status reviewer/admin
//   DELETE /api/reports/:id        admin

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { writeLimiter, upvoteLimiter } = require('../middleware/rateLimit');
const { uploadEvidence, uploadErrorHandler } = require('../middleware/upload');
const {
  reportCreateSchema,
  reportUpdateSchema,
  reportStatusSchema,
  listQuerySchema,
} = require('../validation/schemas');

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Create a report (JSON, or multipart/form-data with `evidence` files)
 *     tags: [Reports]
 *     description: >
 *       Anonymous by default. Up to 10 evidence files, 10 MB each (images, mp4/mov/webm
 *       video, PDF, doc/docx). Files are stored in the evidence bucket; the response
 *       `data.evidence` lists the URLs that were actually stored.
 *     responses:
 *       201: { description: Report created }
 *       400: { description: Validation error }
 *       413: { description: A file is over the size limit }
 */

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Corruption / social-justice report operations
 */

router.get('/', validate(listQuerySchema, 'query'), reportController.getAllReports);
router.get('/:id', optionalAuth, reportController.getReportById);

router.post(
  '/',
  writeLimiter,
  optionalAuth,
  uploadEvidence, // optional multipart `evidence` files; JSON bodies pass straight through
  validate(reportCreateSchema),
  reportController.createReport
);

router.post('/:id/upvote', upvoteLimiter, reportController.upvoteReport);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'reviewer'),
  uploadEvidence,
  validate(reportUpdateSchema),
  reportController.updateReport
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin', 'reviewer'),
  validate(reportStatusSchema),
  reportController.updateReportStatus
);

router.delete('/:id', requireAuth, requireRole('admin'), reportController.deleteReport);

// Turns multer size / count errors into 4xx responses.
router.use(uploadErrorHandler);

module.exports = router;
