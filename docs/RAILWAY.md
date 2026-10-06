# Deploying to Railway (API) + Supabase (DB / Auth)

The API ships from the repo `Dockerfile` (Node + the optional Python service).
`railway.json` pins the Docker builder and a `/health` healthcheck. Railway
injects `PORT`; `src/config/env.js` already reads it.

Production URL: `https://api.uwazi.space` (custom domain → Railway service).

## Service variables (Railway → service → Variables)

| Variable | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | In production the API refuses to boot if a required var is missing. |
| `DATABASE_URL` | Supabase **pooled** string, port `6543`, `?pgbouncer=true&connection_limit=1` | Runtime connection. |
| `DIRECT_URL` | Supabase direct / session-pooler string, port `5432` | Used by `prisma migrate`. |
| `SUPABASE_URL` | `https://kyjtutdpoqrpfuyivifx.supabase.co` | Must be the **Auth** project the frontend signs in against, or every token is rejected. |
| `SUPABASE_ANON_KEY` | the project's publishable key | Public by design. |
| `CORS_ORIGINS` | `https://www.uwazi.space,https://uwazi.space` | Comma-separated. Add a Vercel preview origin only if needed. Defaults to localhost only. |
| `ADMIN_EMAILS` | comma-separated emails | Granted `admin` on first sign-in. |
| `SUPABASE_SERVICE_KEY` | project service-role key | Evidence uploads. Already set on the current deployment; keep it. Never expose it to a client. |
| `EVIDENCE_BUCKET` | `uwazi-evidence` (default) | Bucket in the `SUPABASE_URL` project. Public today, so evidence URLs are world-readable. |
| `LEGACY_PROXY_TARGET` | `http://localhost:8000` | Needed to keep `/api/legacy` (Python analytics) working; it is opt-in now. |
| `ENABLE_API_DOCS` | `false` | Swagger UI off in prod. |

Never commit real DB credentials; set them only in Railway.

## What changed vs. the previously deployed API

- Writes are authenticated: `PUT`/`PATCH status` need a reviewer/admin, `DELETE` an admin
  (Supabase JWT in `Authorization: Bearer`). Previously these were open to anyone.
- `GET /api/reports` returns `{ data, pagination }` and honours `category`, `county`,
  `status`, `q`, `limit`, `skip` (it used to return a bare array and ignore them).
- Report detail no longer exposes author or commenter emails.
- `POST /api/reports` still accepts multipart `evidence` files (same field name), now
  with a file-signature check and the write rate limit; `isAnonymous` is parsed correctly
  from multipart strings. Failed files are listed in `failedUploads`.
- New: `POST /api/reports/:id/upvote`, rate-limited.

## Migrations

`prisma migrate deploy` is **not** run automatically. The production DB already
holds data, so if it was created without Prisma migration history, first
baseline it once, otherwise `migrate deploy` fails with P3005:

```bash
npx prisma migrate resolve --applied 20260204124508_init_users
npx prisma migrate resolve --applied 20260828000000_add_indexes   # only if those indexes already exist
npx prisma migrate deploy
```

Once baselined, add `"preDeployCommand": ["npx prisma migrate deploy"]` to the
`deploy` block of `railway.json` so migrations run before each release.

## Deploy source

Railway builds from the GitHub repo/branch connected to the service. Code only
reaches production once it is committed and pushed there.

## Smoke test after a deploy

```bash
curl https://api.uwazi.space/health                      # {"status":"ok"} on current code
curl "https://api.uwazi.space/api/reports?limit=1"       # {"data":[...],"pagination":{...}}
```
