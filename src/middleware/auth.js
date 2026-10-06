// Authentication & authorization middleware.
//
// Identity provider: Supabase Auth. The frontend signs users in with Supabase
// and sends the resulting access token as `Authorization: Bearer <token>`.
// Here we verify that token, then map the Supabase identity onto a local
// `User` row (matched by email) so we can attach an application role.
//
// Verification strategy:
//   1. If SUPABASE_JWT_SECRET is set -> verify the JWT signature locally (fast,
//      no network). Works for projects using the legacy HS256 signing secret.
//   2. Otherwise -> call supabase.auth.getUser(token) (works with any signing
//      key type, including the newer asymmetric keys).
// Results are cached in-process for a short TTL to avoid re-verifying on every
// request in a burst.

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const supabase = require('../lib/supabase');
const config = require('../config/env');

const CACHE_TTL_MS = 30_000;
const tokenCache = new Map(); // token -> { identity, expires }

function cacheGet(token) {
  const hit = tokenCache.get(token);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    tokenCache.delete(token);
    return null;
  }
  return hit.identity;
}

function cacheSet(token, identity) {
  tokenCache.set(token, { identity, expires: Date.now() + CACHE_TTL_MS });
  // Bound the cache so a flood of distinct tokens can't grow it without limit.
  if (tokenCache.size > 5000) {
    tokenCache.clear();
  }
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, value] = header.split(' ');
  if (scheme && scheme.toLowerCase() === 'bearer' && value) return value.trim();
  return null;
}

async function verifyToken(token) {
  const cached = cacheGet(token);
  if (cached) return cached;

  let identity = null;

  if (config.supabaseJwtSecret) {
    try {
      const payload = jwt.verify(token, config.supabaseJwtSecret, { algorithms: ['HS256'] });
      identity = {
        supabaseId: payload.sub,
        email: (payload.email || '').toLowerCase(),
        name: payload.user_metadata?.full_name || payload.user_metadata?.name || null,
      };
    } catch {
      identity = null;
    }
  }

  if (!identity && supabase) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      identity = {
        supabaseId: data.user.id,
        email: (data.user.email || '').toLowerCase(),
        name:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          null,
      };
    }
  }

  if (identity && identity.email) {
    cacheSet(token, identity);
  }
  return identity;
}

// Find (or lazily create) the local User row for a verified Supabase identity.
async function resolveLocalUser(identity) {
  const email = identity.email;
  if (!email) return null;

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    const role = config.adminEmails.includes(email) ? 'admin' : 'viewer';
    user = await prisma.user.create({
      data: { email, name: identity.name || email.split('@')[0], role },
      select: { id: true, email: true, name: true, role: true },
    });
  } else if (
    config.adminEmails.includes(email) &&
    user.role !== 'admin'
  ) {
    // Keep bootstrap admins in sync if they were created before being listed.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  return user;
}

// Attaches req.user if a valid token is present; never rejects.
const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const identity = await verifyToken(token);
    if (!identity) return next();
    req.user = await resolveLocalUser(identity);
    req.accessToken = token;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('optionalAuth error:', err.message);
  }
  return next();
};

// Rejects the request unless a valid token maps to a local user.
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const identity = await verifyToken(token);
    if (!identity) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await resolveLocalUser(identity);
    if (!user) {
      return res.status(401).json({ error: 'Unable to resolve user account' });
    }
    req.user = user;
    req.accessToken = token;
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('requireAuth error:', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Must run after requireAuth. Restricts to the given application roles.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

module.exports = { optionalAuth, requireAuth, requireRole };
