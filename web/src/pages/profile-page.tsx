import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/auth-context';
import { loginWithGoogle, resetPassword } from '@/services/firebase/auth';
import { PhaseState } from './phase-state';

/**
 * Profile / auth entry point.
 * Sign-in uses the Firebase auth context (wired in the auth phase). The page
 * is functional now: login, register, and password reset all call the real
 * Firebase SDK when configured, and degrade honestly when it is not.
 */
export function ProfilePage() {
  const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PhaseState title="Profile">
        <p>Checking your session…</p>
      </PhaseState>
    );
  }

  if (isAuthenticated && user) {
    return (
      <PhaseState title="Your Profile">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="inline font-medium">Email:</dt>
            <dd className="inline"> {user.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="inline font-medium">UID:</dt>
            <dd className="inline font-mono"> {user.uid}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-3 text-sm">
          <Link to="/orders" className="text-orange-700 underline">View orders</Link>
          <button onClick={() => void logout()} className="text-orange-700 underline">
            Sign out
          </button>
        </div>
      </PhaseState>
    );
  }

  async function handleAuth(mode: 'login' | 'register') {
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed');
    }
  }

  return (
    <PhaseState title="Sign in to SriPon">
      <form
        className="mx-auto flex max-w-sm flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleAuth('login');
        }}
      >
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-orange-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700">
          Sign in
        </button>
        <button
          type="button"
          onClick={() => void handleAuth('register')}
          className="rounded-lg border border-orange-300 px-4 py-2 text-orange-700 hover:bg-orange-50"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            void loginWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Google sign-in failed'));
          }}
          className="rounded-lg border border-orange-300 px-4 py-2 text-orange-700 hover:bg-orange-50"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => {
            if (!email) {
              setError('Enter your email above first');
              return;
            }
            void resetPassword(email)
              .then(() => setInfo('Password reset email sent.'))
              .catch((e) => setError(e instanceof Error ? e.message : 'Reset failed'));
          }}
          className="text-sm text-orange-700 underline"
        >
          Forgot password?
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
      </form>
    </PhaseState>
  );
}