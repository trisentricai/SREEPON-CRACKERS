import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { env } from '@/config/env';

/**
 * Central Firebase client access.
 * The SDK is stateful at module scope, so we initialize exactly once and hand
 * out the same app/auth instance to every consumer. When Firebase env vars are
 * absent the app still boots, but `isFirebaseConfigured()` returns false and
 * vehicle auth features are hidden instead of crashing.
 */

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

/** True when the minimum set of Firebase env vars is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.VITE_FIREBASE_API_KEY &&
      env.VITE_FIREBASE_AUTH_DOMAIN &&
      env.VITE_FIREBASE_PROJECT_ID &&
      env.VITE_FIREBASE_APP_ID,
  );
}

/** Lazily initialize (and memoize) the Firebase app. */
export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) return firebaseApp;
  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    });
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

/** Lazily initialize (and memoize) the Firebase Auth instance. */
export function getFirebaseAuth(): Auth {
  if (firebaseAuth) return firebaseAuth;
  firebaseAuth = getAuth(getFirebaseApp());
  return firebaseAuth;
}

/** Resolve the current Firebase ID token (used by the axios interceptor). */
export async function getAuthToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}