import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import type { Auth, User, Unsubscribe } from 'firebase/auth';
import { getFirebaseAuth } from './index';

/**
 * Firebase Auth helpers for the customer web app.
 * The single auth instance lives in `./index.ts`; these wrappers keep the UI
 * layer free of Firebase plumbing.
 */

function resolveAuth(): Auth {
  return getFirebaseAuth();
}

/** Subscribe to auth state changes (browser session). */
export function watchAuth(onChange: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(resolveAuth(), onChange);
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credentials = await signInWithEmailAndPassword(resolveAuth(), email, password);
  return credentials.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const credentials = await createUserWithEmailAndPassword(resolveAuth(), email, password);
  return credentials.user;
}

/**
 * Google sign-in uses the full-page redirect flow instead of a popup: popups
 * can't receive the auth handshake when the CDN/browser isolates the window
 * (COOP), which made `signInWithPopup` fail with an internal SDK assertion.
 */
export async function loginWithGoogle(): Promise<void> {
  await signInWithRedirect(resolveAuth(), new GoogleAuthProvider());
}

/** After a redirect-based sign-in, resolve the pending result. Call once at boot. */
export async function resolveRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(resolveAuth());
  return result?.user ?? null;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(resolveAuth(), email);
}

export async function logOut(): Promise<void> {
  await signOut(resolveAuth());
}