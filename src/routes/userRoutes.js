// User Routes - all authenticated. Most are admin-only.
//
//   GET    /api/users/me         current user
//   GET    /api/users            admin
//   GET    /api/users/:id        self or admin
//   PUT    /api/users/:id        self or admin (name only)
//   DELETE /api/users/:id        admin
//   PATCH  /api/users/:id/role   admin

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { roleUpdateSchema, profileUpdateSchema, userListQuerySchema } = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User administration (identity handled by Supabase Auth)
 */

router.use(requireAuth);

router.get('/me', userController.getMe);
router.get('/', requireRole('admin'), validate(userListQuerySchema, 'query'), userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', validate(profileUpdateSchema), userController.updateUser);
router.delete('/:id', requireRole('admin'), userController.deleteUser);
router.patch('/:id/role', requireRole('admin'), validate(roleUpdateSchema), userController.updateUserRole);

module.exports = router;
