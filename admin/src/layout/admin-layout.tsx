import type { ReactNode } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/features/auth/context/admin-auth-context';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/categories', label: 'Categories' },
  { to: '/orders', label: 'Orders' },
  { to: '/customers', label: 'Customers' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/coupons', label: 'Coupons' },
  { to: '/banners', label: 'Banners' },
  { to: '/settings', label: 'Settings' },
];

/** Gate: unauthenticated visitors are sent to the login screen. */
export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Application shell: sidebar navigation + top bar + routed content. */
export function AdminLayout() {
  const { user, logout, supabaseReady } = useAdminAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-xl">🎇</span>
          <span className="text-lg font-bold tracking-tight">SriPon Admin</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-orange-600 font-medium text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-400">
          {user?.email && <p className="truncate">{user.email}</p>}
          <button
            onClick={() => void logout()}
            className="mt-2 text-orange-400 underline hover:text-orange-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <p className="text-sm text-slate-500">Operations console</p>
          {!supabaseReady && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Supabase not configured
            </span>
          )}
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}