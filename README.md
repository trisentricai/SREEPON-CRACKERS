# SriPon

<p align="center">
  <strong>Modern festive e-commerce platform for crackers & fireworks</strong>
</p>

**SriPon** is a complete, production-ready e-commerce platform for selling crackers and fireworks. It consists of four applications sharing one authoritative backend:

| Application | Stack | Auth |
|---|---|---|
| `web/` — Customer website | React + Vite + TypeScript + Tailwind CSS | Firebase |
| `mobile/` — Customer mobile app | Flutter + Dart + Riverpod + Dio | Firebase |
| `admin/` — Admin dashboard | React + Vite + TypeScript + Tailwind CSS | Supabase |
| `backend/` — Central REST API | Node.js + TypeScript + Express + Prisma | Firebase + Supabase JWT |

Backing infrastructure: **PostgreSQL (Supabase)** as the primary database, **Redis** for caching/rate-limiting, **Cloudinary** for all media, **Firebase Cloud Messaging** for push notifications.

## Architecture at a glance

```
            S R I P O N
                 │
  ┌──────────────┼──────────────┐
  │              │              │
  ▼              ▼              ▼
 React Web   Flutter App    React Admin
 (Firebase)   (Firebase)    (Supabase)
  │              │              │
  └──────────────┼──────────────┘
                 ▼
        ┌──────────────────┐
        │  Node.js REST API │  ← authoritative business logic
        └────────┬─────────┘
        ┌────────┼─────────┐
        ▼        ▼         ▼
     Prisma     Redis   Cloudinary
        │
        ▼
  Supabase PostgreSQL
```

The backend is **always authoritative** for price, discount, stock, coupons, tax, delivery fees, order totals, payment status, and admin permissions. Frontends never write business-critical records directly and never receive server-side secrets.

## Monorepo layout

```
SriPon/
├── backend/   # Express + TypeScript + Prisma REST API
├── web/       # React customer website
├── admin/     # React admin dashboard
├── mobile/    # Flutter customer app
└── docs/      # Architecture, database, API, auth, deployment docs
```

## Quick start

Prerequisites: Node.js 20+, npm 10+, Flutter 3.24+ (stable).

```bash
# 1. Install backend dependencies
cd backend
npm install
npm run prisma:generate
npm run dev

# 2. Install and run the customer website
cd ../web
npm install
npm run dev

# 3. Install and run the admin dashboard
cd ../admin
npm install
npm run dev

# 4. Run the Flutter app
cd ../mobile
flutter pub get
flutter run
```

Every application requires environment variables. Copy each `.env.example` to `.env` and fill in real values (Firebase, Supabase, Cloudinary, Redis). See **docs/setup.md** for step-by-step configuration.

## Documentation

- [docs/setup.md](docs/setup.md) — full environment setup guide
- [docs/architecture.md](docs/architecture.md) — system architecture
- [docs/database.md](docs/database.md) — database design & models
- [docs/api.md](docs/api.md) — API reference
- [docs/authentication.md](docs/authentication.md) — customer & admin auth flows
- [docs/deployment.md](docs/deployment.md) — production deployment (Render / Supabase / Cloudinary)
- [docs/cloudinary.md](docs/cloudinary.md) — media management
- [docs/firebase.md](docs/firebase.md) — Firebase configuration
- [docs/supabase.md](docs/supabase.md) — Supabase configuration

## Deployment targets

- **Backend** → Render (`render.yaml`)
- **PostgreSQL** → Supabase
- **Redis** → Render / managed Redis
- **Media** → Cloudinary
- **Web / Admin** → Vercel or Render static hosting
- **Mobile** → Android / iOS

Domain names shown in docs (e.g. `api.sripon.example`) are placeholders — configure real domains via environment variables.

## Environment variables

Never commit real `.env` files. Copy the provided `.env.example` templates and populate with your values. Secrets must stay server-side only:

- Firebase Admin private key
- Supabase service role key
- Cloudinary API secret
- Payment secrets
- Database / Redis credentials

See **docs/setup.md** for the full variable reference.

## Safety & compliance

SriPon sells crackers/fireworks. Legal notices (terms, privacy, refund policy, safety notices, delivery and location restrictions, eligibility/age requirements) are **admin-configurable** — they are not hard-coded claims. Before launch, applicable local laws, licensing, age requirements, delivery restrictions, and advertising rules must be reviewed by the business owner.

## Production checklist

See [docs/deployment.md](docs/deployment.md) for the pre-launch checklist.