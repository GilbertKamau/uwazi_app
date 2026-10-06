// Comment Controller
// All writes require authentication; the author is always the signed-in user.

const prisma = require('../lib/prisma');

const commentSelect = {
  id: true,
  content: true,
  reportId: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
};

// POST /api/comments - add a comment (authenticated)
const createComment = async (req, res) => {
  try {
    const { content, reportId } = req.body;

    const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const comment = await prisma.comment.create({
      data: { content, reportId, authorId: req.user.id },
      select: commentSelect,
    });
    res.status(201).json({ message: 'Comment created', data: comment });
  } catch (error) {
    console.error('Error creating comment:', error.message);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// GET /api/comments/report/:reportId - list comments (public, paginated)
const getCommentsByReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { limit, skip } = req.query;

    const report = await prisma.report.findUnique({ where: { id: reportId }, select: { id: true } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { reportId },
        select: commentSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.comment.count({ where: { reportId } }),
    ]);

    res.status(200).json({ data: comments, pagination: { total, limit, skip } });
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// GET /api/comments/:id
const getCommentById = async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      select: { ...commentSelect, report: { select: { id: true, title: true, status: true } } },
    });
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(200).json({ data: comment });
  } catch (error) {
    console.error('Error fetching comment:', error.message);
    res.status(500).json({ error: 'Failed to fetch comment' });
  }
};

// PUT /api/comments/:id - edit (author or admin)
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content: req.body.content },
      select: commentSelect,
    });
    res.status(200).json({ message: 'Comment updated', data: updated });
  } catch (error) {
    console.error('Error updating comment:', error.message);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// DELETE /api/comments/:id - remove (author or admin)
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    await prisma.comment.delete({ where: { id } });
    res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

module.exports = {
  createComment,
  getCommentsByReport,
  getCommentById,
  updateComment,
  deleteComment,
};
