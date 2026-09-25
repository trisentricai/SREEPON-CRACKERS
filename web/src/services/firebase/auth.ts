import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import type { Auth, User, Unsubscribe } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
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
 * Google sign-in. Uses the popup flow first: it surfaces the outcome directly
 * to the caller (never a silent return), so failures are visible in the UI.
 * If the browser blocks the popup we fall back to the full-page redirect,
 * which is resolved by `resolveRedirectSignIn()` at boot.
 */
export async function loginWithGoogle(): Promise<void> {
  const auth = resolveAuth();
  const provider = new GoogleAuthProvider();
  try {
    console.info('[auth] opening Google popup from', window.location.href);
    await signInWithPopup(auth, provider);
    console.info('[auth] Google popup signed in');
  } catch (e) {
    const code = (e as FirebaseError).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      console.warn('[auth] popup blocked, falling back to redirect', code);
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

/** After a redirect-based sign-in, resolve the pending result. Call once at boot. */
export async function resolveRedirectSignIn(): Promise<User | null> {
  const auth = resolveAuth();
  const result = await getRedirectResult(auth);
  console.info(
    '[auth] getRedirectResult ->',
    result?.user?.email ?? null,
    '| currentUser:',
    auth.currentUser?.email ?? null,
  );
  return result?.user ?? null;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(resolveAuth(), email);
}

export async function logOut(): Promise<void> {
  await signOut(resolveAuth());
}