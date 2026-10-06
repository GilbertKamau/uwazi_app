// Report Controller
// Business logic for Report operations.
//
// Anonymity is the security-critical property here. A report submitted with
// isAnonymous=true is NEVER linked to a user row and never carries an author
// name, even if the submitter was signed in. Author identity is only ever set
// from the authenticated session - never from client-supplied fields.

const prisma = require('../lib/prisma');

// Public shape of a report in list views. No author identity leaks here.
const listSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  county: true,
  location: true,
  status: true,
  priority: true,
  upvotes: true,
  evidence: true,
  isAnonymous: true,
  authorName: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { comments: true } },
};

// Strip any author identity from an anonymous report before it leaves the API.
function presentReport(report) {
  if (!report) return report;
  if (report.isAnonymous) {
    const { author, authorName, authorId, ...safe } = report;
    return { ...safe, authorName: null };
  }
  return report;
}

// CREATE - Create a new report (public; anonymous by default)
const createReport = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      county,
      location,
      isAnonymous,
      authorName,
      evidence,
    } = req.body;

    const anonymous = isAnonymous !== false; // default to anonymous

    // Identity is derived from the session only.
    let authorId = null;
    let resolvedAuthorName = null;
    if (!anonymous) {
      if (!req.user) {
        return res
          .status(401)
          .json({ error: 'Sign in to submit a non-anonymous report, or submit anonymously.' });
      }
      authorId = req.user.id;
      resolvedAuthorName = authorName || req.user.name;
    }

    const report = await prisma.report.create({
      data: {
        title,
        description,
        category,
        county,
        location: location || null,
        isAnonymous: anonymous,
        authorName: resolvedAuthorName,
        authorId,
        evidence: evidence || [],
        status: 'pending',
        priority: 'medium',
        upvotes: 0,
      },
      select: listSelect,
    });

    res.status(201).json({ message: 'Report submitted successfully', data: presentReport(report) });
  } catch (error) {
    console.error('Error creating report:', error.message);
    res.status(500).json({ error: 'Failed to create report' });
  }
};

// READ - Get all reports (public feed, paginated + filterable)
const getAllReports = async (req, res) => {
  try {
    const { limit, skip, category, county, status, q } = req.query;

    const where = {};
    if (category) where.category = category;
    if (county) where.county = county;
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.report.count({ where }),
    ]);

    res.status(200).json({
      data: reports.map(presentReport),
      pagination: { total, limit, skip },
    });
  } catch (error) {
    console.error('Error fetching reports:', error.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// READ - Get a single report by ID
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const isStaff = req.user && (req.user.role === 'admin' || req.user.role === 'reviewer');

    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        ...listSelect,
        author: { select: { id: true, name: true, role: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        tags: { select: { id: true, name: true } },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Only staff may see the (non-anonymous) author relation.
    if (!isStaff && report.author) {
      delete report.author;
    }

    res.status(200).json({ data: presentReport(report) });
  } catch (error) {
    console.error('Error fetching report:', error.message);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
};

// UPDATE - Edit report content (staff only)
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { title, description, category, county, location, priority, evidence } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (county !== undefined) data.county = county;
    if (location !== undefined) data.location = location;
    if (priority !== undefined) data.priority = priority;
    if (evidence !== undefined) data.evidence = evidence;

    const updated = await prisma.report.update({ where: { id }, data, select: listSelect });
    res.status(200).json({ message: 'Report updated', data: presentReport(updated) });
  } catch (error) {
    console.error('Error updating report:', error.message);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

// DELETE - Remove a report (admin only)
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    await prisma.report.delete({ where: { id } });
    res.status(200).json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error.message);
    res.status(500).json({ error: 'Failed to delete report' });
  }
};

// PATCH - Update workflow status (staff only)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: { status },
      select: listSelect,
    });
    res.status(200).json({ message: `Report status updated to '${status}'`, data: presentReport(updated) });
  } catch (error) {
    console.error('Error updating report status:', error.message);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};

// POST /:id/upvote - Register a supporting vote.
// Abuse is bounded by the upvote rate limiter; the client also self-limits to
// one vote per report per browser.
const upvoteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const updated = await prisma.report.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });
    res.status(200).json({ data: updated });
  } catch (error) {
    console.error('Error upvoting report:', error.message);
    res.status(500).json({ error: 'Failed to upvote report' });
  }
};

module.exports = {
  createReport,
  getAllReports,
  getReportById,
  updateReport,
  deleteReport,
  updateReportStatus,
  upvoteReport,
};
