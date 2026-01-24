// User Routes
// API endpoints for User operations

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST - Create a new user
router.post('/', userController.createUser);

// GET - Get all users
router.get('/', userController.getAllUsers);

// GET - Get a single user by ID
router.get('/:id', userController.getUserById);

// PUT - Update a user
router.put('/:id', userController.updateUser);

// DELETE - Delete a user
router.delete('/:id', userController.deleteUser);

// PATCH - Update user role
router.patch('/:id/role', userController.updateUserRole);

module.exports = router;

