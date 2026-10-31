# SriPon Production Environment Configuration

**Date:** 31 Oct 2026
**Environment:** Production
**Services:**
- Web storefront: https://sreepon.in (Render)
- Backend API: https://sreepon-api.trisentricai.workers.dev/api/v1 (Cloudflare Workers)
- Admin dashboard: https://sreepon-admin.pages.dev (Cloudflare Pages)
- Mobile app: Flutter (Flutter Web + APK)

---

## Checklist Status

| Item | Status | Details |
|------|--------|---------|
| Production API URLs | ✅ Verified | Backend: `sreepon-api.trisentricai.workers.dev`, Web: `sreepon.in` |
| Custom domain & DNS | ✅ Configured | `sreepon.in` on Render, `www.sreepon.in` CNAME |
| SSL certificate | ✅ Automatic | Render + Cloudflare provide managed TLS |
| Production database | ✅ Configured | Supabase PostgreSQL (external) |
| Redis/cache | ✅ Configured | Upstash (Workers) / Redis URL (Node/Render) |
| CI/CD pipeline | ✅ Configured | Wrangler deploy (Workers) + Render blueprint (web) |
| Database backups | ✅ Implemented | `scripts/backup-db.ts`, `scripts/restore-db.ts` |
| Logging & monitoring | ✅ Configured | pino structured logging, health endpoint |
| Rollback procedure | ⚠️ Documented | Wrangler version rollback + Render rollback |

---

## 1. Production API URLs

| Service | URL | Configured In |
|---------|-----|---------------|
| Backend API | `https://sreepon-api.trisentricai.workers.dev/api/v1` | `wrangler.toml` [vars], `web/.env.example`, `mobile/.env.example` |
| Web storefront | `https://sreepon.in` | Render dashboard, `CORS_ORIGINS` |
| Admin dashboard | `https://sreepon-admin.pages.dev` | Cloudflare Pages, `CORS_ORIGINS` |
| Webhook endpoint | `https://sreepon-api.trisentricai.workers.dev/api/v1/payments/webhooks/cashfree` | `PAYMENT_WEBHOOK_URL` |

All API URLs are verified live. The backend responds to requests from all configured origins.

---

## 2. Custom Domain & DNS

### sreepon.in (Web Storefront)
- **Platform:** Render (web service)
- **DNS:** CNAME record pointing to Render's target
- **SSL:** Managed by Render (automatic TLS)
- **CORS:** Listed in `wrangler.toml` `[vars] CORS_ORIGINS`

### www.sreepon.in
- **DNS:** CNAME to `sreepon.in`
- **SSL:** Same managed certificate

### sreepon-api.trisentricai.workers.dev
- **Platform:** Cloudflare Workers
- **DNS:** Managed by Cloudflare (workers.dev subdomain)
- **SSL:** Managed by Cloudflare (automatic TLS)

---

## 3. SSL Certificate

| Service | Provider | Type | Auto-Renewal |
|---------|----------|------|--------------|
| sreepon.in | Render | Managed TLS | Yes |
| sreepon-api.trisentricai.workers.dev | Cloudflare | Universal SSL | Yes |
| sreepon-admin.pages.dev | Cloudflare Pages | Universal SSL | Yes |

No manual SSL configuration required. All platforms provide managed certificates.

---

## 4. Production Database

**Provider:** Supabase PostgreSQL (external, not self-hosted)

| Variable | Purpose | Where Configured |
|----------|---------|-----------------|
| `DATABASE_URL` | Pooled connection (Node/Render, Workers via adapter) | Render env vars, wrangler secrets |
| `DIRECT_DATABASE_URL` | Direct connection (migrations, backups) | Render env vars, wrangler secrets |

**Connection details** are set in:
- Render dashboard → sripon-api service → Environment variables
- Cloudflare dashboard → sreepon-api Worker → Settings → Variables → Secrets

**Migrations:** `npx prisma migrate deploy` runs on Render start (`startCommand` in render.yaml).

---

## 5. Redis / Cache

| Environment | Provider | Variable |
|-------------|----------|----------|
| Cloudflare Workers | Upstash (REST API) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Node/Render | Managed Redis | `REDIS_URL` |

Used for: rate limiting, API response caching, audit trail storage.

**Workers limitation:** Raw TCP Redis is unavailable on Workers, so Upstash's HTTP REST client is used instead.

---

## 6. CI/CD Pipeline

### Backend API (Cloudflare Workers)
- **Trigger:** Push to `master` branch
- **Platform:** Cloudflare Workers Builds
- **Build command:** `npm install && npm run build && npx prisma generate`
- **Deploy:** `npx wrangler deploy`
- **Cron trigger:** `*/30 * * * *` (expireStaleOrders every 30 minutes)

### Web Storefront (Render)
- **Trigger:** Push to `master` branch
- **Platform:** Render
- **Build command:** `npm install && npm run build && node scripts/sitemap.mjs && node scripts/copy-404.mjs`
- **Start:** Vite dev server (static SPA served by Render)

### Mobile App (Flutter)
- **Trigger:** Manual build
- **Platform:** Local build → APK distribution
- **Build command:** `flutter build apk --release --dart-define=API_BASE_URL=...`

---

## 7. Database Backups

**Implemented** via `backend/scripts/`:

| Script | Purpose |
|--------|---------|
| `backup-db.ts` | `pg_dump` → gzip → Cloudinary (`sripon/db-backups/`) |
| `restore-db.ts` | Cloudinary download → decompress → `pg_restore` / Prisma import |

**npm scripts:**
- `npm run db:backup` — Create a backup
- `npm run db:restore <public_id> [--drop-first]` — Restore from backup

**Admin API:** `GET /admin/maintenance/db-backups` — List available backups (SUPER_ADMIN/ADMIN only).

**Recommendation:** Add a cron job on Render/Node host:
```bash
0 2 * * * cd /path/to/backend && npx tsx scripts/backup-db.ts >> /var/log/sripon-backup.log 2>&1
```

---

## 8. Logging & Monitoring

### Logging
- **Library:** pino (structured JSON logging)
- **Middleware:** pino-http (request logging with correlation IDs)
- **Production level:** `warn`, `error` (query logging disabled in prod)
- **Error handler:** Centralized, never leaks stack traces in production

### Health Monitoring
- **Endpoint:** `GET /health` (root level, not `/api/v1/health`)
- **Checks:** Database connectivity, Redis connectivity
- **Response:** 200 with `services.database.connected` and `services.redis.connected`

### Audit Logging
- **Middleware:** `auditAdmin()` records admin mutations (action, adminId, IP, requestId, route, timestamp)
- **Storage:** Structured logger + Redis trail (`audit:trail` list)

---

## 9. Rollback Procedure

### Cloudflare Workers (Backend)
The Worker keeps versioned deployments. To rollback:

```bash
# List deployments
npx wrangler versions list

# Rollback to a previous version
npx wrangler versions rollback <version_id>
```

Or via Cloudflare dashboard: Workers → sreepon-api → Versions → Select previous → Rollback.

### Render (Web Storefront)
Render keeps deployment history. To rollback:

1. Render dashboard → sreepon-web service → Deploys
2. Select previous successful deploy
3. Click "Rollback to this deploy"

### Mobile App
Mobile rollbacks require publishing a previous APK version to your distribution channel. There is no automatic rollback for mobile — test thoroughly before releasing.

---

## Environment Variable Files

| File | Purpose |
|------|---------|
| `backend/.env.example` | Template — copy to `.env` for local dev |
| `web/.env.example` | Template — copy to `.env` for local dev |
| `mobile/.env.example` | Documentation — values passed via `--dart-define` |

**Never commit real `.env` files.** They are gitignored.

### Required Production Secrets (Backend)

These must be set as encrypted secrets (not plaintext variables):

| Secret | Where | Notes |
|--------|-------|-------|
| `DATABASE_URL` | Render env vars / wrangler secrets | Supabase pooled connection |
| `DIRECT_DATABASE_URL` | Render env vars / wrangler secrets | Supabase direct connection |
| `REDIS_URL` | Render env vars | Managed Redis |
| `JWT_SECRET` | Render env vars / wrangler secrets | Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `FIREBASE_PROJECT_ID` | Render env vars / wrangler secrets | Firebase project |
| `FIREBASE_CLIENT_EMAIL` | Render env vars / wrangler secrets | Firebase service account |
| `FIREBASE_PRIVATE_KEY` | Render env vars / wrangler secrets | Firebase service account private key |
| `FIREBASE_API_KEY` | Render env vars / wrangler secrets | Firebase Web API key (public) |
| `SUPABASE_URL` | Render env vars / wrangler secrets | Supabase project URL |
| `SUPABASE_ANON_KEY` | Render env vars / wrangler secrets | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Render env vars / wrangler secrets | Supabase service role key (SECRET) |
| `CLOUDINARY_CLOUD_NAME` | Render env vars / wrangler secrets | Cloudinary |
| `CLOUDINARY_API_KEY` | Render env vars / wrangler secrets | Cloudinary |
| `CLOUDINARY_API_SECRET` | Render env vars / wrangler secrets | Cloudinary (SECRET) |
| `CASHFREE_APP_ID` | Render env vars / wrangler secrets | Cashfree dashboard |
| `CASHFREE_SECRET_KEY` | Render env vars / wrangler secrets | Cashfree dashboard (SECRET) |
| `CASHFREE_ENV` | wrangler vars | `sandbox` or `production` |
| `STRIPE_SECRET_KEY` | Render env vars / wrangler secrets | Stripe (if used) |
| `STRIPE_WEBHOOK_SECRET` | Render env vars / wrangler secrets | Stripe (if used) |

**Workers secret setting:**
```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put CASHFREE_SECRET_KEY
# etc.
```

**Render secret setting:** Dashboard → Service → Environment → Add Variable (toggle "Encrypt")

---

## 10. Environment Variable Precedence

| Source | Precedence | Notes |
|--------|-----------|-------|
| Cloudflare Workers bindings | Highest (Workers) | Set via `wrangler secret put` / dashboard |
| Render environment variables | Highest (Node/Render) | Set via Render dashboard |
| `.env` file | Low (local dev only) | Loaded by `dotenv/config`, not in production |
| `wrangler.toml` `[vars]` | Medium (Workers) | Public, non-secret values only |
| Code defaults | Lowest | Zod schema defaults in `env.ts` |

---

## Security Notes

1. **Never commit `.env` files** — They contain production secrets.
2. **Never hardcode secrets in source** — All secrets come from environment variables.
3. **Firebase API key is public** — `VITE_FIREBASE_API_KEY` and `FIREBASE_API_KEY` are safe to expose; they identify the Firebase project, not authorize access.
4. **Service role keys are secret** — `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PRIVATE_KEY`, `CLOUDINARY_API_SECRET` must never be in frontend code.
5. **Payment webhook URL** — Must be HTTPS and point to the production backend.
