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