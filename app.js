// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Initialize Express app
const app = express();

// Initialize Prisma Client
const prisma = new PrismaClient();

// Swagger / OpenAPI configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Uwazi API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Uwazi Social Justice Tracking Application',
    },
    servers: [
      {
        url: 'http://localhost:5000', // Your local development URL
      },
    ],
    components: {
      securitySchemes: {
        AdminAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-User-Id',
          description: 'Admin user ID used for protected admin endpoints',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'], // Path to the API docs (where your routes are)
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check for the backend service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Import routes
const reportRoutes = require('./src/routes/reportRoutes');
const userRoutes = require('./src/routes/userRoutes');
const commentRoutes = require('./src/routes/commentRoutes');
const metricsRoutes = require('./src/routes/metricsRoutes');
const signalRoutes = require('./src/routes/signalRoutes');

// Use routes
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/signals', signalRoutes);

// Route legacy Python API requests
app.use('/api/legacy', createProxyMiddleware({ target: 'http://localhost:8000', changeOrigin: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Server initialization
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Connected to database');

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

module.exports = app;

