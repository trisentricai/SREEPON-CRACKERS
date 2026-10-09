import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Bag2, Heart, Logout, Star, User } from 'react-iconly';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { BrandMark } from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';

const USPS = [
  'GST invoice on every order',
  'Licensed & insured warehouse',
  'Ships across India in 24–48h',
  'Fresh stock, sealed boxes',
];

/** Public shell: announcement ribbon, header, main outlet, footer. */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <USPRibbon />
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function USPRibbon() {
  const items = [...USPS, ...USPS];
  return (
    <div
      className="marquee bg-gradient-to-r from-ember-700 via-flame-600 to-ember-700 text-white"
      role="note"
    >
      <div className="marquee-track items-center py-1.5 text-xs font-semibold">
        {items.map((text, index) => (
          <span key={index} className="flex items-center gap-2 px-6" aria-hidden={index >= USPS.length}>
            <Star className="h-3 w-3 text-gold-300" />
            <span className="tracking-wide">{text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SiteHeader() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cartCount = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Cart>>('/cart');
      return data.data;
    },
    enabled: isAuthenticated,
  });

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `relative py-1.5 transition-colors duration-200 hover:text-flame-600 ${isActive ? 'text-flame-600' : 'text-ember-900/80'}`;

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled ? 'border-b border-line bg-paper-strong/95 shadow-pop backdrop-blur' : 'border-b border-ember-100 bg-ember-50/90 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <BrandMark name={SITE.name} />

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <NavLink to="/products" className={navLink} end={false}>
            Shop
          </NavLink>
          <NavLink to="/wishlist" className={navLink}>
            Wishlist
          </NavLink>
          <NavLink to="/orders" className={navLink}>
            Orders
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 text-sm md:gap-3">
          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-flame-50 hover:text-flame-600 md:hidden"
            aria-label="Cart"
          >
            <Bag2 className="h-5 w-5" />
            {!isLoading && isAuthenticated && (cartCount.data?.totalQuantity ?? 0) > 0 && (
              <span
                key={cartCount.data?.totalQuantity ?? 0}
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-flame-600 px-1 text-[10px] font-bold text-white shadow-sm"
              >
                {cartCount.data?.totalQuantity ?? 0}
              </span>
            )}
          </Link>

          <Link
            to="/wishlist"
            className="hidden h-10 w-10 items-center justify-center rounded-full hover:bg-flame-50 hover:text-flame-600 md:flex"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            to="/cart"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-flame-50 hover:text-flame-600 md:flex"
            aria-label="Cart"
          >
            <Bag2 className="h-5 w-5" />
            {!isLoading && isAuthenticated && (cartCount.data?.totalQuantity ?? 0) > 0 && (
              <span
                key={cartCount.data?.totalQuantity ?? 0}
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-flame-600 px-1 text-[10px] font-bold text-white shadow-sm"
              >
                {cartCount.data?.totalQuantity ?? 0}
              </span>
            )}
          </Link>

          <div className="mx-1 hidden h-6 w-px bg-ember-200 md:block" aria-hidden />

          {isLoading ? null : isAuthenticated ? (
            <>
              <Link to="/profile" className="hidden h-10 items-center gap-2 rounded-full px-3 font-medium hover:text-flame-600 sm:inline-flex">
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                onClick={() => void logout()}
                className="inline-flex h-10 items-center gap-2 rounded-full px-3 font-medium text-ember-700 hover:bg-flame-50 hover:text-flame-600"
              >
                <Logout className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </>
          ) : (
            <Link
              to="/profile"
              className="rounded-full bg-flame-600 px-5 py-2 font-semibold text-white shadow-cta transition duration-200 hover:-translate-y-0.5 hover:bg-flame-700 active:scale-95"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const shopLinks = [
    { label: 'Shop crackers', to: '/products' },
    { label: 'New arrivals', to: '/products' },
    { label: 'Gift boxes', to: '/products' },
  ];
  const helpLinks = [
    { label: 'Track order', to: '/orders' },
    { label: 'My wishlist', to: '/wishlist' },
    { label: 'Cart', to: '/cart' },
  ];
  const legalLinks = [
    { label: 'Age restrictions', to: '/profile' },
    { label: 'Storage & safety', to: '/profile' },
    { label: 'Privacy policy', to: '/profile' },
  ];

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-16 border-t border-ember-100 bg-gradient-to-b from-ember-50 to-ember-100/60">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark name={SITE.name} />
            <p className="mt-3 max-w-xs text-sm text-ember-900/70">{SITE.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {USPS.slice(0, 2).map((usp) => (
                <span
                  key={usp}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ember-200 bg-paper-strong px-3 py-1 text-xs font-medium text-ember-800"
                >
                  <Star className="h-3 w-3 text-gold-600" />
                  {usp}
                </span>
              ))}
            </div>
          </div>

          <FooterCol title="Shop" links={shopLinks} />
          <FooterCol title="Help" links={helpLinks} />
          <FooterCol title="Safety & legal" links={legalLinks} />
        </div>

        <div className="mt-10 border-t border-ember-200/70 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ember-900/60">
              © {new Date().getFullYear()} {SITE.name}. CE &amp; ISI-compliant stock. Fireworks are age-gated —
              adults must supervise use.
            </p>
            <button
              onClick={scrollTop}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-ember-300 bg-paper-strong px-4 py-2 text-sm font-semibold text-flame-600 transition duration-200 hover:bg-flame-50 active:scale-95"
            >
              Back to top
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ label: string; to: string }> }) {
  return (
    <div>
      <p className="font-display text-sm font-bold uppercase tracking-eyebrow text-ember-800">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-ember-900/70 transition-colors hover:text-flame-600">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}