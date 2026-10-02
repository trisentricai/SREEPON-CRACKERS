import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import type { Address, ApiEnvelope, PublicProfile, UpdateProfileInput } from '@/api/types';
import { asArray } from '@/api/normalize';
import { ErrorState } from '@/components/storefront-ui';
import { ChunkyButton, FunHeading, Mascot, StickerCard } from '@/components/sticker-ui';
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

const inputCls =
  'rounded-2xl border-2 border-ink bg-white px-4 py-2.5 text-sm font-medium shadow-sticker-sm placeholder:text-ink-muted/60 focus:outline-none focus:bg-sunny-100/50';

/**
 * Profile / sign-in / address book.
 * Authenticated route shows the real backend profile (name, phone, avatar) and
 * lets the customer edit it and manage saved addresses.
 */
export function ProfilePage() {
  const { user, isLoading, isAuthenticated, redirectError, clearRedirectError, login, register, logout } = useAuth();
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
        <div className="mx-auto h-64 max-w-sm animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
      </section>
    );
  }

  if (isAuthenticated && user) {
    if (profile.isLoading || addresses.isLoading) {
      return (
        <section className="mx-auto max-w-7xl px-4 py-12">
          <div className="h-10 w-64 animate-pulse rounded-full border-2 border-ink bg-ember-100" />
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
            <div className="h-72 animate-pulse rounded-bubble border-2 border-ink bg-ember-100" />
          </div>
        </section>
      );
    }
    if (profile.isError || !profile.data) {
      return (
        <section className="mx-auto max-w-7xl px-4 py-12">
          {profile.isError ? <ErrorState error={profile.error} /> : null}
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

  function handleGoogle() {
    setError(null);
    clearRedirectError();
    void loginWithGoogle().catch((e) => setError(friendlyAuthError(e)));
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <StickerCard className="mx-auto max-w-sm bg-sunny-100 p-8 text-center">
        <Mascot className="mx-auto h-24 w-auto" />
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">Join the fun!</h1>
        <p className="mt-1 text-sm font-medium text-ink-muted">Sign in to pop, track and save.</p>
        <form
          className="mt-6 flex flex-col gap-3"
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
            className={inputCls}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <ChunkyButton type="submit" tone="coral" className="w-full">
            Sign in
          </ChunkyButton>
          <ChunkyButton type="button" onClick={() => void handleAuth('register')} tone="white" className="w-full">
            Create account
          </ChunkyButton>
          <ChunkyButton type="button" onClick={handleGoogle} tone="white" className="w-full">
            Continue with Google
          </ChunkyButton>
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
            className="text-sm font-bold text-coral-600 underline"
          >
            Forgot password?
          </button>
          {redirectError && <p className="text-sm font-bold text-red-600">{redirectError}</p>}
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          {info && <p className="text-sm font-bold text-mint-600">{info}</p>}
        </form>
      </StickerCard>
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

  const quickLink =
    'rounded-full border-2 border-ink bg-white px-3 py-1 text-xs font-bold text-ink shadow-sticker-sm transition hover:bg-sunny-100 active:translate-y-0.5 active:shadow-none';

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <StickerCard className="flex flex-wrap items-center gap-4 bg-grape-100 p-5">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Profile"
            className="h-16 w-16 rounded-full border-2 border-ink object-cover shadow-sticker-sm"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-sunny-400 font-display text-2xl font-extrabold text-ink shadow-sticker-sm">
            {(profile.name ?? profile.email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-extrabold text-ink">
            Hey, {profile.name ?? 'pop star'}!
          </h1>
          <p className="text-sm font-medium text-ink-muted">{profile.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/orders" className={quickLink}>Orders</Link>
          <Link to="/wishlist" className={quickLink}>Wishlist</Link>
          <Link to="/cart" className={quickLink}>Cart</Link>
          <button onClick={onLogout} className={`${quickLink} hover:bg-candy-100`}>
            Sign out
          </button>
        </div>
      </StickerCard>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Profile */}
        <StickerCard className="p-5">
          <FunHeading title="Account details" overline="All about you" />
          <dl className="mt-4 space-y-2 text-sm font-medium">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Email</dt>
              <dd className="truncate font-bold text-ink">{profile.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Member since</dt>
              <dd className="font-bold text-ink">{formatDate(profile.createdAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <span className="inline-block rounded-full border-2 border-ink bg-mint-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">
                  Active
                </span>
              </dd>
            </div>
          </dl>

          <form
            className="mt-5 space-y-3 border-t-2 border-ink/10 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile.mutate();
            }}
          >
            <label className="block text-sm font-bold">
              <span className="text-ink-muted">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-1 w-full`} />
            </label>
            <label className="block text-sm font-bold">
              <span className="text-ink-muted">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} mt-1 w-full`} />
            </label>
            {saveError && <p className="text-sm font-bold text-red-600">{saveError}</p>}
            <ChunkyButton type="submit" tone="sunny" disabled={saving} className="px-5 py-2 text-sm">
              {saving ? 'Saving…' : 'Save changes'}
            </ChunkyButton>
          </form>
        </StickerCard>

        {/* Addresses */}
        <StickerCard className="p-5">
          <FunHeading title="Addresses" subtitle="Saved addresses speed up checkout." overline="Where to?" />
          <AddressBook addresses={addresses} />
        </StickerCard>
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
      {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}
      {addresses.length === 0 && !adding && (
        <StickerCard className="bg-bubble-100 p-5 text-center">
          <p className="font-display font-extrabold text-ink">No addresses yet</p>
          <p className="mt-1 text-sm font-medium text-ink-muted">Add one to speed up checkout.</p>
        </StickerCard>
      )}
      <ul className="space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="rounded-2xl border-2 border-ink bg-white p-3 text-sm shadow-sticker-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-bold text-ink">
                  {address.fullName} <span className="font-medium text-ink-muted">· {address.label}</span>
                </p>
                <p className="mt-0.5 font-medium text-ink-muted">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.pincode}
                  <br />
                  {address.phone}
                </p>
              </div>
              {address.isDefault && (
                <span className="shrink-0 rounded-full border-2 border-ink bg-sunny-400 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                  Default
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-3 text-xs font-bold">
              {!address.isDefault && (
                <button onClick={() => setDefault.mutate(address.id)} className="text-coral-600 underline hover:text-coral-700">
                  Set default
                </button>
              )}
              <button onClick={() => remove.mutate(address.id)} className="text-ink-muted underline hover:text-red-600">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding && <AddressForm onDone={() => { setAdding(false); void invalidate(); }} onError={setMessage} />}
      {!adding && (
        <ChunkyButton onClick={() => setAdding(true)} tone="white" className="mt-3 px-4 py-2 text-sm">
          + Add address
        </ChunkyButton>
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
      className="mt-4 grid grid-cols-1 gap-3 rounded-bubble border-2 border-ink bg-paper p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <input required placeholder="Label (Home, Office…)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
      <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputCls} />
      <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
      <input required placeholder="Address line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className={`${inputCls} sm:col-span-2`} />
      <input placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className={`${inputCls} sm:col-span-2`} />
      <input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
      <input required placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} />
      <input required placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className={inputCls} />
      <input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} />
      <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4 accent-[#e8513f]" />
        Set as default
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <ChunkyButton type="submit" tone="sunny" disabled={saving} className="px-4 py-2 text-sm">
          {saving ? 'Saving…' : 'Save address'}
        </ChunkyButton>
        <ChunkyButton type="button" onClick={onDone} tone="white" className="px-4 py-2 text-sm">
          Cancel
        </ChunkyButton>
      </div>
    </form>
  );
}
