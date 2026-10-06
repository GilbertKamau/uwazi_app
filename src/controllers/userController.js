// User Controller
// User rows are provisioned automatically by the auth middleware on first
// authenticated request. These endpoints are for reading/administering them.
// Passwords and sign-in are handled entirely by Supabase Auth.

const prisma = require('../lib/prisma');

const publicUserSelect = {
  id: true,
  name: true,
  role: true,
  createdAt: true,
};

const adminUserSelect = {
  ...publicUserSelect,
  email: true,
  updatedAt: true,
  _count: { select: { reports: true, comments: true } },
};

// GET /api/users/me - the caller's own profile
const getMe = async (req, res) => {
  res.status(200).json({ data: req.user });
};

// GET /api/users - list users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const { role, limit, skip } = req.query;
    const where = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({ data: users, pagination: { total, limit, skip } });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/users/:id - single user (admin, or the user themselves)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const isSelf = req.user.id === id;
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: isAdmin || isSelf ? adminUserSelect : publicUserSelect,
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// PUT /api/users/:id - update profile (self or admin). Email is owned by
// Supabase and cannot be changed here.
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { name: req.body.name },
      select: adminUserSelect,
    });
    res.status(200).json({ message: 'Profile updated', data: updated });
  } catch (error) {
    console.error('Error updating user:', error.message);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// DELETE /api/users/:id - remove a user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own account here' });
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// PATCH /api/users/:id/role - change a user's role (admin only)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: adminUserSelect,
    });
    res.status(200).json({ message: `Role updated to '${role}'`, data: updated });
  } catch (error) {
    console.error('Error updating user role:', error.message);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

module.exports = {
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
};
