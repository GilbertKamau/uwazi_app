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
const {
  reportCreateSchema,
  reportUpdateSchema,
  reportStatusSchema,
  listQuerySchema,
} = require('../validation/schemas');

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
  validate(reportCreateSchema),
  reportController.createReport
);

router.post('/:id/upvote', upvoteLimiter, reportController.upvoteReport);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'reviewer'),
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

module.exports = router;
