import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Address, ApiEnvelope, PublicProfile, UpdateProfileInput } from '@/api/types';
import { asArray } from '@/api/normalize';
import { Badge, EmptyState, ErrorState, Spinner } from '@/components/storefront-ui';
import { useAuth } from '@/features/auth/context/auth-context';
import { loginWithGoogle, resetPassword } from '@/services/firebase/auth';
import { formatDate } from '@/lib/format';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-login-credentials': 'Invalid email or password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/email-already-in-use': 'An account already exists for this email.',
  'auth/too-many-requests': 'Too many attempts — please try again shortly.',
  'auth/network-request-failed': 'Network error — please check your connection.',
  'auth/popup-blocked': 'The sign-in window was blocked — allow popups for this site.',
};

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  return err instanceof Error && err.message ? err.message : 'Authentication failed';
}

/**
 * Profile / sign-in / address book.
 * Authenticated route shows the real backend profile (name, phone, avatar) and
 * lets the customer edit it and manage saved addresses.
 */
export function ProfilePage() {
  const { user, isLoading, isAuthenticated, login, register, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<PublicProfile>>('/users/me');
      return data.data;
    },
    enabled: isAuthenticated,
  });

  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Address[]>>('/addresses');
      return asArray<Address>(data.data);
    },
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Spinner label="Checking your session…" />
      </section>
    );
  }

  if (isAuthenticated && user) {
    if (profile.isLoading || addresses.isLoading) {
      return (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <Spinner label="Loading your profile…" />
        </section>
      );
    }
    if (profile.isError || !profile.data) {
      return (
        <section className="mx-auto max-w-7xl px-4 py-12">
          {profile.isError ? <ErrorState error={profile.error} /> : <Spinner label="Loading your profile…" />}
        </section>
      );
    }

    return <ProfileSummary profile={profile.data} addresses={addresses.data ?? []} onLogout={() => void logout()} onUpdated={() => queryClient.invalidateQueries({ queryKey: ['profile'] })} />;
  }

  async function handleAuth(mode: 'login' | 'register') {
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ember-800">Sign in to SriPon</h1>
      <form
        className="mx-auto mt-6 flex max-w-sm flex-col gap-3"
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
          className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-ember-600 px-4 py-2 text-white hover:bg-ember-700">
          Sign in
        </button>
        <button
          type="button"
          onClick={() => void handleAuth('register')}
          className="rounded-lg border border-ember-300 px-4 py-2 text-ember-700 hover:bg-ember-50"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            void loginWithGoogle().catch((e) => setError(friendlyAuthError(e)));
          }}
          className="rounded-lg border border-ember-300 px-4 py-2 text-ember-700 hover:bg-ember-50"
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
              .catch((e) => setError(friendlyAuthError(e)));
          }}
          className="text-sm text-ember-700 underline"
        >
          Forgot password?
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
      </form>
    </section>
  );
}

function ProfileSummary({
  profile,
  addresses,
  onLogout,
  onUpdated,
}: {
  profile: PublicProfile;
  addresses: Address[];
  onLogout: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(profile.name ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const payload: UpdateProfileInput = {};
      if (name !== (profile.name ?? '')) payload.name = name || undefined;
      if (phone !== (profile.phone ?? '')) payload.phone = phone || undefined;
      if (Object.keys(payload).length === 0) return profile;
      const { data } = await api.patch<ApiEnvelope<PublicProfile>>('/users/me', payload);
      return data.data;
    },
    onMutate: () => setSaving(true),
    onSettled: () => setSaving(false),
    onSuccess: () => onUpdated(),
    onError: (err) => setSaveError(err instanceof Error ? err.message : 'Could not save profile'),
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-ember-800">Your Profile</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/orders" className="text-ember-700 underline">Orders</Link>
          <Link to="/wishlist" className="text-ember-700 underline">Wishlist</Link>
          <Link to="/cart" className="text-ember-700 underline">Cart</Link>
          <button onClick={onLogout} className="text-ember-700 underline">
            Sign out
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-xl border border-ember-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-ember-900">Account details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-ember-900/50">Email</dt>
              <dd className="font-medium text-ember-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-ember-900/50">Member since</dt>
              <dd className="font-medium text-ember-900">{formatDate(profile.createdAt)}</dd>
            </div>
            {profile.avatarUrl && (
              <div>
                <dt className="text-ember-900/50">Avatar</dt>
                <dd className="mt-1">
                  <img src={profile.avatarUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                </dd>
              </div>
            )}
            <Badge tone="green">Active</Badge>
          </dl>

          <form
            className="mt-5 space-y-3 border-t border-ember-100 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile.mutate();
            }}
          >
            <label className="block text-sm">
              <span className="text-ember-900/60">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ember-900/60">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ember-200 px-3 py-2 text-sm"
              />
            </label>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Addresses */}
        <div className="rounded-xl border border-ember-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-ember-900">Addresses</h2>
          <p className="mt-1 text-sm text-ember-900/50">Saved addresses can be selected at checkout.</p>
          <AddressBook addresses={addresses} />
        </div>
      </div>
    </section>
  );
}

function AddressBook({ addresses }: { addresses: Address[] }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [error, setMessage] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });
  const onError = (err: unknown) => setMessage(err instanceof Error ? err.message : 'Something went wrong');

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/addresses/${id}`);
    },
    onSuccess: () => void invalidate(),
    onError,
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/addresses/${id}/default`);
    },
    onSuccess: () => void invalidate(),
    onError,
  });

  return (
    <div className="mt-4">
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {addresses.length === 0 && !adding && (
        <EmptyState title="No addresses yet">
          <p>Add an address to speed up checkout.</p>
        </EmptyState>
      )}
      <ul className="space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-lg border border-ember-100 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ember-900">
                  {address.fullName} <span className="text-ember-900/40">· {address.label}</span>
                </p>
                <p className="mt-0.5 text-ember-900/60">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pincode}
                  <br />
                  {address.phone}
                </p>
              </div>
              {address.isDefault && <Badge tone="orange">Default</Badge>}
            </div>
            <div className="mt-2 flex gap-3 text-xs">
              {!address.isDefault && (
                <button onClick={() => setDefault.mutate(address.id)} className="text-ember-700 underline hover:text-ember-800">
                  Set default
                </button>
              )}
              <button onClick={() => remove.mutate(address.id)} className="text-ember-900/50 underline hover:text-red-600">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding && <AddressForm onDone={() => { setAdding(false); void invalidate(); }} onError={setMessage} />}
      {!adding && (
        <button onClick={() => setAdding(true)} className="mt-3 rounded-lg border border-ember-300 px-4 py-2 text-sm font-semibold text-ember-700 hover:bg-ember-50">
          + Add address
        </button>
      )}
    </div>
  );
}

function AddressForm({ onDone, onError }: { onDone: () => void; onError: (message: string) => void }) {
  const [form, setForm] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'IN',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/addresses', {
        ...form,
        line2: form.line2 || undefined,
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-ember-100 bg-ember-50/40 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <input required placeholder="Label (Home, Office…)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm sm:col-span-2" />
      <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm sm:col-span-2" />
      <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input required placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="rounded-lg border border-ember-200 px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 accent-ember-600" />
        Set as default
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-ember-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ember-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg border border-ember-300 px-4 py-2 text-sm text-ember-700 hover:bg-ember-50">
          Cancel
        </button>
      </div>
    </form>
  );
}