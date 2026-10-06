const express = require('express');
const router = express.Router();
const politicianController = require('../controllers/politicianController');

/**
 * @swagger
 * /api/politicians:
 *   get:
 *     summary: Retrieve a list of all politicians along with their court cases and social mentions.
 *     tags: [Politicians]
 *     responses:
 *       200:
 *         description: A list of politicians
 */
router.get('/', politicianController.getPoliticians);

/**
 * @swagger
 * /api/politicians/{id}:
 *   get:
 *     summary: Retrieve a specific politician by ID
 *     tags: [Politicians]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The politician ID
 *     responses:
 *       200:
 *         description: Politician details
 *       404:
 *         description: Politician not found
 */
router.get('/:id', politicianController.getPoliticianById);

module.exports = router;
