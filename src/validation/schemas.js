// zod request schemas. These are the single point where untrusted input is
// shaped and bounded before it reaches Prisma.

const { z } = require('zod');
const {
  REPORT_CATEGORIES,
  REPORT_STATUSES,
  REPORT_PRIORITIES,
  KENYA_COUNTIES,
} = require('../utils/constants');
const { cleanText, isSafeHttpUrl } = require('../utils/sanitize');

const trimmed = (min, max) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(min).max(max));

const evidenceArray = z
  .array(z.string().max(2048).refine(isSafeHttpUrl, 'Evidence must be an http(s) URL'))
  .max(10, 'At most 10 evidence links')
  .optional()
  .default([]);

const reportCreateSchema = z.object({
  title: trimmed(5, 160),
  description: trimmed(20, 8000),
  category: z.enum(REPORT_CATEGORIES),
  county: z.enum(KENYA_COUNTIES),
  location: z.string().transform(cleanText).pipe(z.string().max(200)).optional(),
  isAnonymous: z.coerce.boolean().optional().default(true),
  authorName: z.string().transform(cleanText).pipe(z.string().max(120)).optional(),
  evidence: evidenceArray,
});

const reportUpdateSchema = z
  .object({
    title: trimmed(5, 160).optional(),
    description: trimmed(20, 8000).optional(),
    category: z.enum(REPORT_CATEGORIES).optional(),
    county: z.enum(KENYA_COUNTIES).optional(),
    location: z.string().transform(cleanText).pipe(z.string().max(200)).optional(),
    priority: z.enum(REPORT_PRIORITIES).optional(),
    evidence: evidenceArray.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No updatable fields provided');

const reportStatusSchema = z.object({
  status: z.enum(REPORT_STATUSES),
});

const commentCreateSchema = z.object({
  reportId: z.string().min(1).max(64),
  content: trimmed(1, 4000),
});

const commentUpdateSchema = z.object({
  content: trimmed(1, 4000),
});

const roleUpdateSchema = z.object({
  role: z.enum(['admin', 'reviewer', 'viewer']),
});

const profileUpdateSchema = z
  .object({
    name: trimmed(1, 120).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'No updatable fields provided');

const paginationBase = {
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  skip: z.coerce.number().int().min(0).max(100000).optional().default(0),
};

const listQuerySchema = z.object({
  ...paginationBase,
  category: z.enum(REPORT_CATEGORIES).optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  q: z.string().transform(cleanText).pipe(z.string().max(120)).optional(),
});

const userListQuerySchema = z.object({
  ...paginationBase,
  role: z.enum(['admin', 'reviewer', 'viewer']).optional(),
});

module.exports = {
  reportCreateSchema,
  reportUpdateSchema,
  reportStatusSchema,
  commentCreateSchema,
  commentUpdateSchema,
  roleUpdateSchema,
  profileUpdateSchema,
  listQuerySchema,
  userListQuerySchema,
};
