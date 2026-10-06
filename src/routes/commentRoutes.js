// Comment Routes
//
//   GET    /api/comments/report/:reportId   public
//   GET    /api/comments/:id                public
//   POST   /api/comments                    authenticated (rate limited)
//   PUT    /api/comments/:id                author or admin
//   DELETE /api/comments/:id                author or admin

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimit');
const {
  commentCreateSchema,
  commentUpdateSchema,
  listQuerySchema,
} = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment operations on reports
 */

router.get('/report/:reportId', validate(listQuerySchema, 'query'), commentController.getCommentsByReport);
router.get('/:id', commentController.getCommentById);

router.post('/', writeLimiter, requireAuth, validate(commentCreateSchema), commentController.createComment);
router.put('/:id', requireAuth, validate(commentUpdateSchema), commentController.updateComment);
router.delete('/:id', requireAuth, commentController.deleteComment);

module.exports = router;
