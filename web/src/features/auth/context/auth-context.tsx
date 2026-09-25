import { onAuthStateChanged } from 'firebase/auth';
import type { Unsubscribe, User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/api/client';
import { getAuthToken, getFirebaseAuth } from '@/services/firebase';
import {
  logOut as doLogOut,
  loginWithEmail,
  registerWithEmail,
  resolveRedirectSignIn,
} from '@/services/firebase/auth';

/**
 * Auth context for the customer web app.
 * Keeps the Firebase session in React state and exposes the current user plus
 * the helpers the UI needs (login, register, logout). The API client attaches
 * the ID token automatically via `getAuthToken()`.
 */

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  redirectError: string | null;
  clearRedirectError: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const bridgedUid = useRef<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let active = true;
    let unsubscribe: Unsubscribe | null = null;

    (async () => {
      try {
        const redirected = await resolveRedirectSignIn();
        if (active && redirected) {
          console.info('[auth] Google redirect result consumed:', redirected.email ?? redirected.uid);
        }
      } catch (e) {
        // Best-effort: consuming the redirect result must never block boot,
        // but surface the reason so Google sign-in failure isn't silent.
        console.warn('Redirect sign-in failed', e);
        if (active) {
          setRedirectError(e instanceof Error ? e.message : 'Google sign-in could not complete');
        }
      }
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setIsLoading(false);
      });
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  // Bridge the Firebase session into the backend (find-or-create the User row)
  // once per session. Without it every authenticated endpoint 401s with
  // "Profile not found". Best-effort — catalog browsing must still work.
  useEffect(() => {
    if (!user) {
      bridgedUid.current = null;
      return;
    }
    if (bridgedUid.current === user.uid) return;
    bridgedUid.current = user.uid;
    void (async () => {
      try {
        const idToken = await getAuthToken();
        if (!idToken) return;
        await api.post('/auth/login', { idToken });
      } catch (err) {
        console.warn('Session bridge to backend failed', err);
      }
    })();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await loginWithEmail(email, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const u = await registerWithEmail(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await doLogOut();
    setUser(null);
  }, []);

  const clearRedirectError = useCallback(() => setRedirectError(null), []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    redirectError,
    clearRedirectError,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}