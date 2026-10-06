// Single shared PrismaClient instance.
// Previously every controller created its own `new PrismaClient()`, which
// exhausts the database connection pool under load. Import this instead.

const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__uwaziPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__uwaziPrisma = prisma;
}

module.exports = prisma;
