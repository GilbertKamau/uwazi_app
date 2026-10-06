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
| `ENABLE_API_DOCS` | `false` | Swagger UI off in prod. |

Never commit real DB credentials; set them only in Railway.

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
