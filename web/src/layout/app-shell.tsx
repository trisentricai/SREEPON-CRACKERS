import { Link, Outlet } from 'react-router-dom';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';

/** Public shell: header, main outlet, footer. */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const { isAuthenticated, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-orange-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-xl font-bold text-orange-700">
          {SITE.name}
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link to="/products" className="hover:text-orange-600">Shop</Link>
          <Link to="/cart" className="hover:text-orange-600">Cart</Link>
          <Link to="/wishlist" className="hover:text-orange-600">Wishlist</Link>
          <Link to="/orders" className="hover:text-orange-600">Orders</Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {isLoading ? null : isAuthenticated ? (
            <>
              <Link to="/profile" className="hover:text-orange-600">Profile</Link>
              <button onClick={() => void logout()} className="hover:text-orange-600">
                Log out
              </button>
            </>
          ) : (
            <Link to="/profile" className="rounded-full bg-orange-600 px-4 py-1.5 text-white hover:bg-orange-700">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-orange-100 bg-orange-50 py-8">
      <div className="mx-auto max-w-7xl px-4 text-sm text-orange-900/60">
        <p className="font-semibold text-orange-800">{SITE.name} — {SITE.tagline}</p>
        <p className="mt-1">Legal compliance pages (age gates, storage &amp; safety) arrive with the content phase.</p>
      </div>
    </footer>
  );
}