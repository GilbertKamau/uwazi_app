// Middleware to require admin role for protected routes
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Requires the request to include a valid admin user.
 * Expects X-User-Id header with the authenticated user's ID.
 * Verifies the user exists and has role === 'admin'.
 */
const requireAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({
      error: 'Admin access required',
      message: 'Missing X-User-Id header. Please authenticate as an admin user.',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Admin access required',
        message: 'User not found.',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin role required to access this resource.',
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('requireAdmin middleware error:', error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
};

module.exports = { requireAdmin };
