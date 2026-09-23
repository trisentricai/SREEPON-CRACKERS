# SriPon — System Architecture

Four applications share **one authoritative backend**. The backend owns every
business-critical decision; frontends render, collect input, and call the API.

## Applications

| Application | Path | Stack | Auth broker |
|---|---|---|---|
| Customer website | `web/` | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 | Firebase Auth |
| Customer mobile app | `mobile/` | Flutter (+ Dio, Firebase, Riverpod in later phases) | Firebase Auth |
| Admin dashboard | `admin/` | React 19 + Vite 8 + TypeScript + Tailwind CSS 4 | Supabase Auth |
| Central REST API | `backend/` | Node.js + TypeScript + Express 4 + Prisma | Firebase + Supabase JWT |

## Data flow

```
  React Web ──┐
  Flutter App─┼─► Node.js REST API ──► PostgreSQL (Supabase)
  React Admin─┘        │  │  │
                       │  │  └──► Cloudinary (media uploads)
                       │  └─────► Redis (caching / rate limiting)
                       └──► Firebase Auth (customers) / Supabase Auth (admins)
```

- **Idempotency & totals**: price, discount, stock, coupon validity, tax,
  delivery fee, order totals and payment status are computed **only** on the
  backend (see `backend/src/modules/`). Frontends never write these directly.
- **Secrets**: Firebase private key, Supabase service-role key, Cloudinary API
  secret and payment secrets live only in the backend environment.

## Backend layout

```
backend/src/
├── app.ts                 Express app factory (also used by tests)
├── server.ts              HTTP bootstrap + graceful shutdown
├── config/                env validation (zod), constants, Swagger
├── middleware/            auth (Firebase/Supabase), validation, error, audit
├── modules/               one folder per domain (auth, products, orders, ...)
├── infrastructure/        Prisma, Redis, Firebase Admin, Supabase, Cloudinary
├── routes/v1.ts           API v1 route table
├── utils/                 HTTP helpers, logger, rate limiting
└── types/                 shared domain enums
```

### Middleware stack (applied in `app.ts`)

1. `helmet` / security headers
2. `cors` (allowlist from `CORS_ORIGINS`)
3. body parsing + size limits
4. request logging + `Request-Id`
5. `audit.middleware` — structured audit trail for mutating admin calls
6. `not-found.middleware` — JSON 404 envelope
7. `error.middleware` — envelope errors, never leaks internals
8. Rate limiting on auth / checkout routes (`utils/rate-limit.ts`, Redis-backed
   with an in-memory fallback when Redis is unavailable)

### Route scoping rule

Module routers are mounted **unprefixed** in `routes/v1.ts`
(`v1Router.use(cartRouter)`). Security guards inside each module are therefore
**path-scoped** (`router.use('/cart', requireFirebase())`) — a guards must never
be applied at the module root, or it would protect the whole `/api/v1` tree.

## Frontend layout

```
web/src/  and  admin/src/
├── app/            router + providers
├── config/         env validation (zod), env access
├── context/        app-wide context providers
├── layout/         shell (header/sidebar) + routed Outlet
├── features/       feature-scoped modules (auth, ...)
├── pages/          route components
├── api/            axios client + typed envelope
└── lib/            shared utilities
```

`mobile/lib/` follows a feature-based layout (`features/<area>/presentation/`,
`core/`, `config/`) with a dependency-free `main.dart` → `app.dart` →
`ShellScreen` (5-tab `NavigationBar` with honest phase placeholders).

## Phasing

Phase 1 ships compiling, honest shells everywhere: backend endpoints are
registered but return **501 Not Implemented** with a JSON envelope; frontends
render placeholder states instead of faking data. Full domain logic, the Prisma
schema and the Venmo-style payment flows are introduced in later phases.