# Uwazi Backend

Express + Prisma (PostgreSQL) API for the Uwazi corruption-reporting platform.

## Setup

```bash
cd uwazi_backend
npm install
cp .env.example .env          # fill in real values (see below)

npx prisma generate
npx prisma migrate deploy     # applies prisma/migrations against DIRECT_URL

npm run dev                   # http://localhost:5000  (nodemon)
# or: npm start
```

### Environment (`.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres connection used at runtime |
| `DIRECT_URL` | Direct Postgres connection used for migrations |
| `SUPABASE_URL` | Supabase **Auth** project URL (the one the frontend signs in against) |
| `SUPABASE_ANON_KEY` | Publishable/anon key — used only to verify user tokens |
| `SUPABASE_JWT_SECRET` | *(optional)* enables fast local HS256 token verification |
| `CORS_ORIGINS` | Comma-separated allowlist of browser origins |
| `ADMIN_EMAILS` | Comma-separated emails auto-granted the `admin` role on first sign-in |
| `ENABLE_API_DOCS` | Swagger UI at `/api-docs` (default: on in dev, off in prod) |
| `LEGACY_PROXY_TARGET` | *(optional)* base URL of the Python analytics service for `/api/legacy` |

> **Never commit `.env`.** If a secret has been committed, rotate it in Supabase.

## Authentication & authorization

Identity is **Supabase Auth**. The frontend sends the Supabase access token as
`Authorization: Bearer <token>`. `src/middleware/auth.js`:

1. Verifies the token (local HS256 if `SUPABASE_JWT_SECRET` is set, otherwise
   `supabase.auth.getUser()`), with a short in-process cache.
2. Maps the identity to a local `users` row by email, creating one on first
   sign-in (`admin` if the email is in `ADMIN_EMAILS`, else `viewer`).
3. Attaches `req.user = { id, email, name, role }`.

Middleware: `requireAuth`, `optionalAuth`, `requireRole(...roles)`.

## API

Every list endpoint returns `{ data, pagination }`; single-resource endpoints
return `{ data, message? }`.

### Reports
| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/reports` | public (filters: `category`, `county`, `status`, `q`, `limit`, `skip`) |
| `GET` | `/api/reports/:id` | public (author identity hidden unless staff) |
| `POST` | `/api/reports` | public — anonymous by default, rate limited |
| `POST` | `/api/reports/:id/upvote` | public — rate limited |
| `PUT` | `/api/reports/:id` | `reviewer` / `admin` |
| `PATCH` | `/api/reports/:id/status` | `reviewer` / `admin` |
| `DELETE` | `/api/reports/:id` | `admin` |

### Comments
| `GET` | `/api/comments/report/:reportId` | public |
| `POST` | `/api/comments` | authenticated |
| `PUT` / `DELETE` | `/api/comments/:id` | author or `admin` |

### Users
| `GET` | `/api/users/me` | authenticated |
| `GET` | `/api/users` | `admin` |
| `GET` / `PUT` | `/api/users/:id` | self or `admin` |
| `DELETE` | `/api/users/:id` | `admin` |
| `PATCH` | `/api/users/:id/role` | `admin` |

### Metrics / Signals
`GET /api/metrics/stats`, `GET /api/metrics/signal-types` — `admin` only.
`POST /api/signals` — public, validated, stored group-only (never per individual).

## Security posture

`helmet` headers · CORS allowlist · global + per-write rate limits · `zod`
validation on every write · body size cap (256 kB) · error responses never leak
stack traces in production · Swagger and the legacy proxy are opt-in.

**Anonymity:** a report submitted with `isAnonymous` is never linked to a user
row or author name, even for a signed-in submitter, and author identity is only
ever taken from the verified session — never from client-supplied fields.

## Data & Integrity Signals (Python service)

`python-service/` contains the optional analytics service (signal submission,
group-only aggregation, "Is this normal?" checks, charts). Run it separately and
point `LEGACY_PROXY_TARGET` at it, or use the Node `/api/signals` +
`/api/metrics` endpoints which reimplement the same logic. Signals are stored in
`data/signals.json`.
