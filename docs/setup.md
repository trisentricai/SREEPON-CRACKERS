# SriPon — Setup Guide

Step-by-step environment configuration for running the full monorepo locally.

## Prerequisites

- Node.js **20.x+** (Vite 8 requires 20.19+ / 22.12+)
- npm **10+**
- Flutter **3.24+** (stable) with Android/iOS toolchains for `mobile/`
- A terminal with PowerShell (recommended on Windows), bash/zsh otherwise

## 1. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev            # http://localhost:5000
```

Verify: `/health`, `/api`, `/api/docs` (Swagger), `/api/openapi.json`.

### `backend/.env` (copy from `.env.example`)

| Variable | Notes |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `5000` |
| `CORS_ORIGINS` | comma-separated browser origins, e.g. `http://localhost:5173,http://localhost:5174` |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | Supabase pooled + direct connection strings |
| `REDIS_URL` | optional; falls back to in-memory rate limiting |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin (customer auth). Or `FIREBASE_SERVICE_ACCOUNT_PATH` for local dev |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase (admin auth) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | media |
| `PAYMENT_*` | active payment provider settings (set at go-live) |

The server boots even with empty optionals (validation is lenient); only the
code paths that use a missing service fail closed with `503`.

## 2. Customer website

```bash
cd web
npm install
npm run dev            # http://localhost:5173
```

### `web/.env` (copy from `.env.example`)

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | API base, default `http://localhost:5000/api/v1` |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Firebase web app config (see `docs/firebase.md`) |

## 3. Admin dashboard

```bash
cd admin
npm install
npm run dev            # http://localhost:5174
```

### `admin/.env` (copy from `.env.example`)

| Variable | Notes |
|---|---|
| `VITE_API_BASE_URL` | API base, default `http://localhost:5000/api/v1` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | **Never** set in the browser — server-only |

## 4. Mobile app

```bash
cd mobile
flutter pub get
flutter run            # requires a connected device/emulator
```

Configuration is injected at build time via `--dart-define`:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api/v1
```

`mobile/lib/config/env.dart` defaults to `http://localhost:5000/api/v1`
(Android emulator: use `10.0.2.2`).

## 5. External services

- **Supabase** → create a project, copy URL/keys, run `docs/supabase.md`.
- **Firebase** → create a web (and mobile) app, copy config, `docs/firebase.md`.
- **Cloudinary** → create an account, copy cloud name/key/secret,
  `docs/cloudinary.md`.
- **Redis** → local `redis-server` or a managed instance (render.com free tier,
  Upstash, or your provider of choice).

## Validation

Each app validates its own environment at boot with zod (web/admin) or
`String.fromEnvironment` (mobile). Run the project-wide checks:

```bash
cd backend && npm run typecheck && npm run lint && npm run build && npm test
cd web     && npm run typecheck && npm run lint && npm run build
cd admin   && npm run typecheck && npm run lint && npm run build
cd mobile  && flutter pub get && flutter analyze
```