# SriPon — Firebase Configuration

Firebase is the **customer** identity broker and push-notification platform.
It is used by the customer website (`web/`), the mobile app (`mobile/`), and
the backend (Firebase Admin SDK for token verification).

During Phase 1 the backend and web only need **configuration**; auth flows are
already wired end-to-end on the web (login/register/google/password-reset
degrade honestly when Firebase env is absent).

## 1. Create the project

1. Go to [Firebase console](https://console.firebase.google.com) → Add project.
2. Add **Authentication** → Sign-in method → enable **Email/Password** and
   **Google**.
3. Enable **Firebase Cloud Messaging** for push (later phases).

## 2. Web app config

1. Project settings → Your apps → Add app → **Web**.
2. Copy the `firebaseConfig` values into `web/.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

The web client reads these through `web/src/config/env.ts` (validated with
zod). `web/src/services/firebase/index.ts` exposes `isFirebaseConfigured()`,
`getFirebaseApp()`, `getFirebaseAuth()`, `getAuthToken()`.

## 3. Mobile (Android/iOS)

1. Add an Android (and/or iOS) app in the Firebase console.
2. Project settings → download `google-services.json` (Android) →
   `mobile/android/app/` and add the Gradle plugin; iOS →
   `GoogleService-Info.plist`.
3. The mobile app declares `firebase_core`, `firebase_auth`, `google_sign_in`
   in `mobile/pubspec.yaml`; they are enabled at runtime when
   `FIREBASE_AUTH_ENABLED` is passed via `--dart-define`.

## 4. Backend (Firebase Admin)

Used by `requireFirebase()` to verify customer ID tokens. Two ways to configure:

**Option A — service account JSON (local dev):**

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

**Option B — credentials via env:**

```bash
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

The private key contains newlines — store it as a **single line with `\n`**
or use a secret manager which preserves formatting. The server's
`src/infrastructure/firebase.ts` fails closed: if Firebase is unconfigured,
customer-protected routes return `503`.

## 5. Email templates

Authentication → Templates: customize verification email, password reset
email, and the email-taken message. Link the emails to your real app domain.

## 6. Authorized domains / Security rules

- Authentication → Authorized domains: add web + admin origins (e.g.
  `localhost`, your production domain).
- Verify the Firebase project is in a **production** billing mode for
  notifications at scale (FCM free tier details on Firebase pricing).

## 7. Production checklist

- [ ] Real (non-placeholder) Firebase app values in web/mobile env
- [ ] Verified custom domains for auth redirect URLs
- [ ] Secure service-account key in the backend host's secret manager
- [ ] Enrollment of FCM topics/device tokens wired for notifications (later phase)