# SriPon — Authentication

Two independent identity brokers, one authoritative backend.

| Audience | Broker | Token sent to API | Verified by (server) |
|---|---|---|---|
| Customers (web + mobile) | **Firebase Auth** | Firebase ID token | Firebase Admin SDK (`verifyIdToken`) |
| Admins (dashboard) | **Supabase Auth** | Supabase access token | Supabase JWKS (`verifySupabaseToken`) |

## Why two brokers

- Customers use email/password and Google sign-in (Firebase supports both
  clients: web SDK and mobile SDK).
- Admins are provisioned through Supabase Auth, which also powers row-level
  security in the Supabase PostgreSQL instance. The backend verifies the admin
  JWT and enforces roles from token `app_metadata`.

## How a request is authenticated

1. Client signs in with its broker and obtains a short-lived token.
2. Client sends `Authorization: Bearer <token>`.
3. Backend reads `auth.middleware.ts` guards:
   - **Customers** → `requireFirebase()`: re-verifies the Firebase ID token
     (with `checkRevoked: true`) and populates `req.user`.
   - **Admins** → `requireSupabase()`: re-verifies the Supabase JWT signature
     and populates `req.admin`; `requireAdminRoles(...)` then enforces
     `OWNER | ADMIN | MANAGER | ANALYST` from `app_metadata.roles`.
4. Fails closed: missing/expired/invalid token → `401`; no configured broker
   → `503`; wrong role → `403`.

Frontend **never** mints the backend's bearer token — it only forwards the
broker's token.

## Customer sign-in (web)

- `web/src/services/firebase/auth.ts` — `loginWithEmail`,
  `registerWithEmail`, `loginWithGoogle`, `resetPassword`, `logOut`.
- `web/src/features/auth/context/auth-context.tsx` — React context that
  subscribes via `onAuthStateChanged`, exposes `user`,
  `isLoading`, `isAuthenticated`, and the actions above.

## Admin sign-in (dashboard)

- `admin/src/lib/supabase.ts` — lazy `createClient` with anon key (safe to
  ship) and `getAccessToken()`.
- `admin/src/features/auth/context/admin-auth-context.tsx` — subscribes to
  `supabase.auth.getSession()` + `onAuthStateChange`, exposes
  `login` (password), `logout`, `user`, `isLoading`, `supabaseReady`.
- `admin/src/layout/admin-layout.tsx` — `RequireAdminAuth` gate redirects to
  `/login` when unauthenticated.

## Mobile (planned with the mobile phase)

`mobile/lib/config/env.dart` already exposes `firebaseAuthEnabled`; the
official `firebase_auth`, `firebase_core`, and `google_sign_in` plugins are
declared in `mobile/pubspec.yaml` and will be wired in a later phase.

## Rules

- Secrets (Firebase private key, Supabase service-role key) are **server-only**.
- Admin role changes happen via the backend admin profile, not in client code.
- Tokens are short-lived; clients silently refresh via the broker SDK.