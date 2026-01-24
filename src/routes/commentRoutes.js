// Comment Routes
// API endpoints for Comment operations

const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// POST - Create a new comment
router.post('/', commentController.createComment);

// GET - Get all comments for a report
router.get('/report/:reportId', commentController.getCommentsByReport);

// GET - Get a single comment by ID
router.get('/:id', commentController.getCommentById);

// PUT - Update a comment
router.put('/:id', commentController.updateComment);

// DELETE - Delete a comment
router.delete('/:id', commentController.deleteComment);

module.exports = router;

