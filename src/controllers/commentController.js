// Comment Controller
// Handles all business logic for Comment operations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CREATE - Create a new comment on a report
const createComment = async (req, res) => {
  try {
    const { content, reportId, authorId } = req.body;

    // Validate required fields
    if (!content || !reportId || !authorId) {
      return res.status(400).json({ 
        error: 'Content, reportId, and authorId are required' 
      });
    }

    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: authorId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content,
        reportId,
        authorId
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        report: {
          select: { id: true, title: true }
        }
      }
    });

    res.status(201).json({
      message: 'Comment created successfully',
      data: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// READ - Get all comments for a report
const getCommentsByReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Fetch comments with pagination
    const comments = await prisma.comment.findMany({
      where: { reportId },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get total count for pagination
    const total = await prisma.comment.count({
      where: { reportId }
    });

    res.status(200).json({
      data: comments,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// READ - Get a single comment by ID
const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        report: {
          select: { id: true, title: true, status: true }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.status(200).json(comment);
  } catch (error) {
    console.error('Error fetching comment:', error);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
};

// UPDATE - Update a comment
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validate input
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        report: {
          select: { id: true, title: true }
        }
      }
    });

    res.status(200).json({
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// DELETE - Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if comment exists
    const comment = await prisma.comment.findUnique({
      where: { id }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = {
  createComment,
  getCommentsByReport,
  getCommentById,
  updateComment,
  deleteComment
};

