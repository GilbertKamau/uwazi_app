// Uwazi API server

const config = require('./src/config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const prisma = require('./src/lib/prisma');
const { apiLimiter } = require('./src/middleware/rateLimit');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// Behind a proxy/load balancer (Render, Fly, Nginx) so rate limiting and
// req.ip use the real client address.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security headers ---
app.use(
  helmet({
    // API only serves JSON; a restrictive CSP is cheap insurance.
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);

// --- CORS: explicit allowlist only ---
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / curl / server-to-server (no Origin header).
      // Disallowed origins get no CORS headers (browser blocks) rather than a 500.
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- Body parsing with hard size caps ---
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

// --- Global rate limit ---
app.use(apiLimiter);

// --- Health check ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// --- API docs (disabled in production unless ENABLE_API_DOCS=true) ---
if (config.enableApiDocs) {
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Uwazi API',
        version: '1.0.0',
        description: 'API for the Uwazi corruption-reporting platform',
      },
      components: {
        securitySchemes: {
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    apis: ['./src/routes/*.js'],
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// --- Routes ---
app.use('/api/reports', require('./src/routes/reportRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/comments', require('./src/routes/commentRoutes'));
app.use('/api/metrics', require('./src/routes/metricsRoutes'));
app.use('/api/signals', require('./src/routes/signalRoutes'));
app.use('/api/politicians', require('./src/routes/politicianRoutes'));

// --- Legacy Python analytics proxy (opt-in only) ---
if (config.legacyProxyTarget) {
  app.use(
    '/api/legacy',
    createProxyMiddleware({ target: config.legacyProxyTarget, changeOrigin: true })
  );
}

// --- 404 + error handling ---
app.use(notFound);
app.use(errorHandler);

// --- Boot ---
const startServer = async () => {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('✓ Connected to database');
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`✓ Uwazi API listening on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
