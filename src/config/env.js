// Centralized environment configuration and validation.
// Fails fast on boot if required variables are missing, so we never run
// half-configured in production.

require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    if (isProd) {
      // Hard fail in production - a missing secret must not boot.
      throw new Error(`Missing required environment variable: ${name}`);
    }
    // eslint-disable-next-line no-console
    console.warn(`[env] ${name} is not set - some features will be disabled in ${NODE_ENV}`);
    return undefined;
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

const config = {
  nodeEnv: NODE_ENV,
  isProd,
  port: parseInt(optional('PORT', '5000'), 10),

  // Comma-separated list of allowed browser origins for CORS.
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5174,http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Supabase is the identity provider. The backend only needs to *verify*
  // tokens, so the anon key + URL are enough for auth.getUser().
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  // Optional: enables fast local HS256 verification without a network call.
  supabaseJwtSecret: optional('SUPABASE_JWT_SECRET', undefined),

  // Evidence file storage. The service key bypasses RLS: server-side only.
  // Without it, report creation still works but attached files are skipped.
  supabaseServiceKey: optional('SUPABASE_SERVICE_KEY', undefined),
  evidenceBucket: optional('EVIDENCE_BUCKET', 'uwazi-evidence'),

  // Toggle the interactive API docs. Off by default in production.
  enableApiDocs: optional('ENABLE_API_DOCS', isProd ? 'false' : 'true') === 'true',

  // Legacy Python analytics service proxy. Off unless explicitly configured.
  legacyProxyTarget: optional('LEGACY_PROXY_TARGET', undefined),

  // Bootstrap: emails that should be granted the admin role on first login.
  adminEmails: optional('ADMIN_EMAILS', '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
};

module.exports = config;
