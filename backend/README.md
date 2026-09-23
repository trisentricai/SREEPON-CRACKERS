# SriPon Backend

Central Node.js REST API for the SriPon e-commerce platform. Express + TypeScript + Prisma + PostgreSQL (Supabase) + Redis + Cloudinary + Firebase Admin + Supabase JWT verification.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in real values (see docs/setup.md)
npm run prisma:generate
npm run dev            # http://localhost:5000
```

Once running: API at `http://localhost:5000/api/v1`, Swagger docs at `http://localhost:5000/api/docs`, OpenAPI JSON at `http://localhost:5000/api/openapi.json`, health at `http://localhost:5000/health`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm run typecheck` | TypeScript strict type check |
| `npm run lint` | ESLint (typescript-eslint) |
| `npm run format` | Prettier |
| `npm test` | Vitest + Supertest |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production |

## Architecture

```
src/
├── config/           Centralized configuration (env, constants, swagger)
├── middleware/       auth (Firebase/Supabase), validation, error, not-found, audit
├── modules/          One folder per domain (controller/service/repository/routes/schema)
├── infrastructure/   Prisma, Redis, Firebase Admin, Supabase, Cloudinary clients
├── routes/           API v1 route table
├── utils/            HTTP helpers, logging, rate limiting
├── types/            Shared domain enums & types
├── app.ts            Express app factory (used by tests)
└── server.ts         HTTP bootstrap & graceful shutdown
```

## Security invariants

- The backend is the **single source of truth** for price, discount, stock, coupon validity, tax, delivery fee, order totals, payment status, and admin permissions.
- Firebase ID tokens (customers) and Supabase access tokens (admins) are **re-verified server-side** — frontend claims are never trusted.
- Secrets (Firebase private key, Supabase service role key, Cloudinary API secret, payment secrets, database/Redis credentials) never leave the server and never appear in logs.

## Documentation

Full guides live in [`../docs`](../docs): setup, architecture, database, API, authentication, deployment.