# SriPon — Deployment

Production topology: backend on **Render**, database on **Supabase**, media on
**Cloudinary**, Redis managed, web/admin static on Vercel or Render.

All placeholder domains (`api.sripon.example`, etc.) must be replaced with real
domains via environment variables.

## Backend on Render

`render.yaml` at the repo root defines one `sripon-api` web service:

- `rootDir: backend`
- Build: `npm install && npm run build && npx prisma generate`
- Start: `npx prisma migrate deploy && node dist/server.js`
- Health check: `/health`
- Environment variables are `sync: false` — set them in the Render dashboard
  (mirror `backend/.env.example`; production values, not placeholders).

The service role key (`SUPABASE_SERVICE_ROLE_KEY`), Firebase private key and
Cloudinary secret must **never** reach browsers — they stay as server env vars.

## Backend on Cloudflare Workers (alternative to Render)

The same Express app also runs on Cloudflare Workers through the
`cloudflare:node` HTTP bridge, deployed from the `backend` directory:

```bash
cd backend
npm ci
npx prisma generate
npm run build        # tsc -> dist/, then scripts/build-worker.mjs -> dist/worker.bundle.mjs
npx wrangler deploy
```

Wrangler config lives in `backend/wrangler.toml` (`main` points at the
pre-bundled `dist/worker.bundle.mjs`, `compatibility_flags = ["nodejs_compat"]`).
The Worker name is `sreepon-api` and the throwaway `*.workers.dev` URL stays
enabled. Cloudflare Workers Builds runs the same steps; `dist/` is rebuilt on
every run and is not committed.

**Secrets** are not stored in `wrangler.toml`. Set every secret from
`.env.example` in the dashboard (Workers Builds → Settings → Variables and
Secrets) or with `npx wrangler secret put <NAME>` — `DATABASE_URL`,
`DIRECT_DATABASE_URL`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, the Firebase/Supabase/Cloudinary/payment keys, etc.
Only `NODE_ENV`, `DEPLOY_TARGET=workers` and `CORS_ORIGINS` live in `[vars]`.

**KV binding.** A KV namespace (`sreeponredis`) is bound as `KV` for the
Redis-replacement role on Workers.

### Workers limitations

Workers has no local filesystem and no raw TCP sockets, so a few things differ
from Render:

- **Database connections are per-request.** Workers closes idle sockets when a
  request finishes, so a shared `pg` pool would hand a dead connection to the
  next query and the request would hang. `src/infrastructure/prisma.ts`
  therefore creates a Prisma client per request (opened inside the request's I/O
  context) and disconnects it afterwards (`runWithRequestPrisma`, wired in
  `worker.mjs`). Node/Render keeps the ordinary single-instance client.
- **Redis uses Upstash over HTTP.** `ioredis` needs `node:net` sockets Workers
  does not expose, so on Workers `src/infrastructure/redis.ts` returns an
  Upstash REST client (`@upstash/redis`) when `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` are set — caching, the audit trail and
  Redis-backed rate limiting all work through it. Node/Render keeps using
  `REDIS_URL` (ioredis). Without Upstash credentials on Workers the in-memory
  fallbacks take over.
- **Rate limiting** uses a timer-free `WorkersMemoryStore` when Upstash is not
  configured (per-isolate), or the Upstash-backed store when it is.
- **Swagger UI** (`/api/docs`) is Node-only and not mounted on Workers;
  `/api/openapi.json` still serves the spec.

Verify a deployment with: `GET /health` (DB `connected: true`),
`/api/v1/categories`, `/api/v1/products?page=1&limit=1`, `/api/v1/homepage`,
`/api/openapi.json`.

## Database (Supabase)

1. Create a Supabase project.
2. Set `DATABASE_URL` (pooled, port `5432`) and `DIRECT_DATABASE_URL`
   (direct, port `6543`) from the project's connection settings.
3. Apply migrations: `cd backend && npm run prisma:deploy`.
4. Keep the service-role key server-only; enable RLS (see `docs/supabase.md`).

## Redis

Provide `REDIS_URL` to any managed Redis. If Redis is unreachable, the backend
degrades to an in-memory rate-limiting bucket (single-instance only —
acceptable for early deployments).

## Media (Cloudinary)

See `docs/cloudinary.md` for upload presets and URLs. Cloudinary handles
transforms/resizing; the backend stores public IDs only.

## Web & Admin (static hosting)

Build outputs:

```bash
cd web   && npm run build    # dist/ → host
cd admin && npm run build    # dist/ → host
```

Host each on Vercel or Render Static Sites. SPA rewrites: send unknown paths
to `index.html` (client-side routing). Set `VITE_API_BASE_URL` and broker
config per environment at build time.

## Mobile

- **Android**: generate an AAB for the Play Store; configure Firebase
  (`google-services.json`) and Google sign-in; inject `API_BASE_URL` via
  `--dart-define`.
- **iOS/iPadOS**: App Store build; configure `GoogleService-Info.plist` and the
  sign-in URL scheme.
- Push notifications use Firebase Cloud Messaging (`docs/firebase.md`).

## Static assets & DNS

| Target | Suggested |
|---|---|
| API | `api.sripon.example` |
| Web | `sripon.example` / `www` |
| Admin | `admin.sripon.example` |
| Media | dedicated Cloudinary subdomain |

Update `CORS_ORIGINS` on the backend to the real web + admin origins.

## Pre-launch checklist

- [ ] Real provider credentials in production env (no `.env.example` values)
- [ ] `prisma migrate deploy` applied; backups enabled (Supabase PITR)
- [ ] Redis with persistence; rate limits tuned
- [ ] Cloudinary upload presets restricted (no unsigned public uploads)
- [ ] Payments: webhook endpoint configured on the gateway, `PAYMENT_WEBHOOK_URL` set, production merchant keys
- [ ] HTTPS everywhere; SPA rewrites configured for web and admin
- [ ] Legal pages, safety notices, age/eligibility and delivery restrictions reviewed by owner (fireworks legality, regional rules)
- [ ] Monitoring: logs (request IDs), `/health` alerts, audit log review
- [ ] Backup/restore drill and rollback plan in place