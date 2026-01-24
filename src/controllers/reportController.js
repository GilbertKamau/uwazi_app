// Report Controller
// Handles all business logic for Report operations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CREATE - Create a new report

// CREATE - Create a new report
const createReport = async (req, res) => {
  try {
    const { 
      title, 
      category, 
      description, 
      county,      // Matches the "Select county" dropdown
      location,    // Matches "Specific area"
      isAnonymous, // Matches the safety checkbox
      authorId,    // Logged in user ID (if any)
      authorName,  // Matches the "Your Name" input
      evidence     // Array of strings (URLs)
    } = req.body;

    // 1. Validate required fields based on UI (marked with * in screenshot)
    if (!title || !category || !description || !county) {
      return res.status(400).json({ 
        error: 'Please fill in all required fields: Title, Category, Description, and County' 
      });
    }

    // 2. Create the report in the database
    const report = await prisma.report.create({
      data: {
        title,
        category,
        description,
        county,
        location: location || null,
        isAnonymous: !!isAnonymous,
        // UI logic: If anonymous, use the default string; otherwise, use the provided name
        authorName: isAnonymous ? "Anonymous Report" : (authorName || "Guest User"),
        // Database logic: Keep the relation if logged in, but the UI will hide it if anonymous
        authorId: authorId || null,
        // Matches the String[] type in schema
        evidence: evidence || [],
        status: 'pending', // Default status for new reports
        priority: 'medium', // Default priority
        upvotes: 0
      },
      // Include author details in the response to update the UI feed immediately
      include: {
        author: {
          select: { name: true, role: true }
        }
      }
    });

    res.status(201).json({ 
      message: 'Report submitted successfully', 
      data: report 
    });
  } catch (error) {
    console.error('Prisma Error:', error);
    res.status(500).json({ error: 'Failed to create report. Ensure the database is synced.' });
  }
};

// READ - Get all reports (Optimized for the Feed in image_23e093.png)
const getAllReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        county: true,
        location: true,
        createdAt: true,
        isAnonymous: true,
        authorName: true,
        status: true,
        _count: {
          select: { 
            comments: true, // For the "67" comments icon in UI
            upvotes: true   // For the "312" upvote icon in UI
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// // READ - Get all reports with filters
// const getAllReports = async (req, res) => {
//   try {
//     const { status, category, priority, authorId, limit = 10, skip = 0 } = req.query;

//     // Build filter object
//     const where = {};
//     if (status) where.status = status;
//     if (category) where.category = category;
//     if (priority) where.priority = priority;
//     if (authorId) where.authorId = authorId;

//     // Fetch reports with pagination
//     const reports = await prisma.report.findMany({
//       where,
//       include: {
//         author: {
//           select: { id: true, name: true, email: true }
//         },
//         comments: {
//           select: { id: true, content: true }
//         }
//       },
//       orderBy: { createdAt: 'desc' },
//       take: parseInt(limit),
//       skip: parseInt(skip)
//     });

//     // Get total count for pagination
//     const total = await prisma.report.count({ where });

//     res.status(200).json({
//       data: reports,
//       pagination: {
//         total,
//         limit: parseInt(limit),
//         skip: parseInt(skip)
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching reports:', error);
//     res.status(500).json({ error: 'Failed to fetch reports' });
//   }
// };

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

