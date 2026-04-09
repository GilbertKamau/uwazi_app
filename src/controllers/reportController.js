// Report Controller
// Handles all business logic for Report operations

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// Initialize Supabase client for file storage
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = 'uwazi-evidence';

// Helper: upload files to Supabase Storage and return public URLs
const uploadEvidence = async (files) => {
  const urls = [];
  if (!files || files.length === 0) return urls;

  for (const file of files) {
    // Unique path: evidence/<timestamp>-<original-name>
    const fileName = `evidence/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      continue; // skip failed uploads, don't block the entire report
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    urls.push(urlData.publicUrl);
  }
  return urls;
};

// CREATE - Create a new report (with file uploads)
const createReport = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      county,
      location,
      isAnonymous,
      authorId,
      authorName,
    } = req.body;

    // Validate required fields
    if (!title || !category || !description || !county) {
      return res.status(400).json({
        error: 'Please fill in all required fields: Title, Category, Description, and County'
      });
    }

    // Upload evidence files to Supabase Storage
    const evidenceUrls = await uploadEvidence(req.files);

    const report = await prisma.report.create({
      data: {
        title,
        category,
        description,
        county,
        location: location || null,
        isAnonymous: isAnonymous === 'true' || isAnonymous === true,
        authorName: (isAnonymous === 'true' || isAnonymous === true)
          ? 'Anonymous Report'
          : (authorName || 'Guest User'),
        authorId: authorId || null,
        evidence: evidenceUrls,
        status: 'pending',
        priority: 'medium',
        upvotes: 0,
      },
      include: {
        author: { select: { name: true, role: true } }
      }
    });

    res.status(201).json({
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Failed to create report.' });
  }
};

// READ - Get all reports
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
        upvotes: true,
        evidence: true,
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(reports);
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

// UPDATE - Update a report (with optional new file uploads)
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, category, priority,
      location, county, figmaLink, figmaFields,
      existingEvidence // JSON-stringified array of URLs to keep
    } = req.body;

    // Check if report exists
    const existingReport = await prisma.report.findUnique({ where: { id } });
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Upload any new evidence files
    const newUrls = await uploadEvidence(req.files);

    // Merge kept existing URLs with newly uploaded URLs
    let evidence;
    if (existingEvidence || newUrls.length > 0) {
      const kept = existingEvidence ? JSON.parse(existingEvidence) : existingReport.evidence;
      evidence = [...kept, ...newUrls];
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(county && { county }),
        ...(location !== undefined && { location }),
        ...(figmaLink !== undefined && { figmaLink }),
        ...(figmaFields && { figmaFields }),
        ...(evidence && { evidence }),
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

// DELETE - Delete a report (and clean up storage files)
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Clean up evidence files from Supabase Storage
    if (report.evidence && report.evidence.length > 0) {
      const filePaths = report.evidence.map(url => {
        // Extract path after the bucket name in the public URL
        const parts = url.split(`${BUCKET_NAME}/`);
        return parts[1] || null;
      }).filter(Boolean);

      if (filePaths.length > 0) {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(filePaths);

        if (error) {
          console.error('Storage cleanup error:', error);
          // Don't block the delete — log and continue
        }
      }
    }

    // Delete report (comments will cascade delete)
    await prisma.report.delete({ where: { id } });

    res.status(200).json({ message: 'Report deleted successfully' });
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

    const validStatuses = ['pending', 'reviewing', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

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
