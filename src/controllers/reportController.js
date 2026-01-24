// Report Controller
// Handles all business logic for Report operations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CREATE - Create a new report
const createReport = async (req, res) => {
  try {
    const { title, description, category, priority, authorId, location, date, figmaLink, figmaFields } = req.body;

    // Validate required fields
    if (!title || !authorId) {
      return res.status(400).json({ error: 'Title and authorId are required' });
    }

    // Create report in database
    const report = await prisma.report.create({
      data: {
        title,
        description: description || null,
        category: category || 'Other',
        priority: priority || 'medium',
        authorId,
        location: location || null,
        date: date ? new Date(date) : null,
        figmaLink: figmaLink || null,
        figmaFields: figmaFields || null
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// READ - Get all reports with filters
const getAllReports = async (req, res) => {
  try {
    const { status, category, priority, authorId, limit = 10, skip = 0 } = req.query;

    // Build filter object
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (authorId) where.authorId = authorId;

    // Fetch reports with pagination
    const reports = await prisma.report.findMany({
      where,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          select: { id: true, content: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(skip)
    });

    // Get total count for pagination
    const total = await prisma.report.count({ where });

    res.status(200).json({
      data: reports,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// READ - Get a single report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        tags: {
          select: { id: true, name: true }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// UPDATE - Update a report
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority, location, date, figmaLink, figmaFields } = req.body;

    // Check if report exists
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update report
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(location !== undefined && { location }),
        ...(date && { date: new Date(date) }),
        ...(figmaLink !== undefined && { figmaLink }),
        ...(figmaFields && { figmaFields })
      },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(200).json({
      message: 'Report updated successfully',
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// DELETE - Delete a report
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if report exists
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Delete report (comments will cascade delete)
    await prisma.report.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// CHANGE STATUS - Update report status
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewing', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Check if report exists
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Update status
    const updatedReport = await prisma.report.update({
      where: { id },
      data: { status },
      include: {
        author: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(200).json({
      message: `Report status updated to '${status}'`,
      data: updatedReport
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  deleteReport,
  updateReportStatus
};

