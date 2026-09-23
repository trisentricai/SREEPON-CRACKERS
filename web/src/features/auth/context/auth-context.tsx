import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getFirebaseAuth } from '@/services/firebase';
import { logOut as doLogOut, loginWithEmail, registerWithEmail } from '@/services/firebase/auth';

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
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

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

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
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