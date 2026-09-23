# SriPon — Supabase Configuration

Supabase powers two things in SriPon:

1. **PostgreSQL** — the platform's primary database (via Prisma).
2. **Auth** — the admin dashboard identity broker (JWT verification).

The service-role key is **server-only** and never shipped to the browser.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com).
2. Save from Project Settings → API:
   - `SUPABASE_URL` (project URL, e.g. `https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY` (safe for browsers)
   - `SUPABASE_SERVICE_ROLE_KEY` (**server only**)

## 2. Database connection strings

From Project Settings → Database → Connection string:

| Env var | Port | Use |
|---|---|---|
| `DATABASE_URL` | 5432 (pooled) | Runtime (Prisma) |
| `DIRECT_DATABASE_URL` | 6543 (direct) | Migrations (`prisma migrate deploy`) |

Set both in `backend/.env` and in Render/Railway env vars.

## 3. Prisma

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name init   # local dev
npm run prisma:deploy                    # production migrations
```

Prisma talks to Postgres through the pooler. Migrations must use the **direct**
connection (`directUrl` is already configured in `prisma/schema.prisma`).

## 4. Admin authentication

The backend verifies **Supabase access tokens** (not Firebase) for admin
routes. Enable it:

1. Auth → Providers: keep email/password enabled (phone optional).
2. Auth → URL Configuration: add the admin app origin(s)
   (`http://localhost:5174` for dev; the production `admin.*` origin).
3. Auth → Sign In / New Users: decide whether to require email confirmation.
4. The backed `requireSupabase()` resolves the JWT with the project's JWKS
   keys (automatically fetched from `{SUPABASE_URL}/auth/v1/certs`).

### Admin roles

Roles are read from the verified token's `app_metadata.roles`. `requireAdminRoles`
enforces `SUPER_ADMIN | ADMIN | PRODUCT_MANAGER | ORDER_MANAGER | CONTENT_MANAGER | ANALYST`
(see `backend/src/types/enums.ts`). Set an admin's role:

1. In Supabase Dashboard → Authentication → Users, open the user.
2. Under custom claims / `app_metadata`, set `roles: ["ADMIN"]` (or the
   appropriate role for the endpoint's `requireAdminRoles(...)` allowlist).
3. The token must be re-issued for changes to take effect.

## 5. Row-level security

The API's service role owns writes from the backend. Suggested posture:

- `ALTER ENABLE ROW LEVEL SECURITY` on customer-facing tables.
- Public/authenticated roles receive the least privilege needed.
- The **service role** bypasses RLS for backend-originated writes (create
  policies accordingly, or keep RLS read policies for the anon role only).
- DB functions/triggers (email uniqueness, order sequencing) run as the owner.

## 6. Production checklist

- Storage: only enable what the frontends need; the API uploads via Cloudinary.
- Backups: enable automatic backups / PITR on the project.
- Never put the service-role key in web/admin `.env` or in the browser.