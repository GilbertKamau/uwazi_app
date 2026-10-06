// Deprecated: the old X-User-Id header check was trivially spoofable.
// Kept as a thin alias so existing imports keep working; it now enforces a
// verified Supabase session with the admin role.

const { requireAuth, requireRole } = require('./auth');

const requireAdmin = [requireAuth, requireRole('admin')];

module.exports = { requireAdmin };
