import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Bag2, Heart, Location, Logout, Send, Star, User } from 'react-iconly';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { QuickCartBar, QuickSearch } from '@/components/quick-commerce-ui';
import { BrandMark } from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';
import { LEGAL_LINKS } from '@/lib/legal';
import { usePublicLegal, usePublicSettings } from '@/lib/queries';

const USPS = [
  '10–15 min delivery',
  'GST invoice on every order',
  'Fresh stock guaranteed',
  'Easy returns',
];

/** Brand glyphs (inline SVG paths, 24×24) for the footer social row. */
const INSTAGRAM_PATH =
  'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.42.42.68.82.9 1.4.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.22.6-.48 1-.9 1.4-.42.42-.82.68-1.4.9-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42a3.9 3.9 0 0 1-1.4-.9 3.9 3.9 0 0 1-.9-1.4c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.22-.6.48-1 .9-1.4.42-.42.82-.68 1.4-.9.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 2.2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm6.4-2.6a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z';
const FACEBOOK_PATH =
  'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.45-.13-2.4 0-4.05 1.47-4.05 4.17V9.9H7.5V13h2.7v8h3.3Z';
const YOUTUBE_PATH =
  'M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z';

/** Public shell: glass header, main outlet, compact footer. */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <SiteHeader />
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <SiteFooter />
      <ShellCartBar />
      <WhatsAppFab />
    </div>
  );
}

/** Floating cart bar — the persistent quick-commerce checkout entry point. */
function ShellCartBar() {
  const { isAuthenticated } = useAuth();
  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Cart>>('/cart');
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  if (!isAuthenticated || !cart.data || cart.data.totalQuantity <= 0) return null;
  return <QuickCartBar quantity={cart.data.totalQuantity} subtotal={cart.data.subtotal} />;
}

/**
 * Floating "chat with us" button. Only rendered when the store has a WhatsApp
 * number configured, so an unconfigured store shows nothing rather than a
 * dead link.
 */
function WhatsAppFab() {
  const { data } = usePublicSettings();
  const number = data?.social.whatsappNumber?.replace(/[^0-9]/g, '');
  if (!number) return null;

  const message = encodeURIComponent(
    `Hi ${data?.store.name || SITE.name}, I have a question about my order.`,
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      className="quick-fab-clear fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-accent/90 active:scale-95 sm:bottom-5 sm:right-5 sm:h-14 sm:w-14"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.46s1.06 2.86 1.2 3.06c.15.2 2.07 3.17 5.02 4.44.7.3 1.25.48 1.68.62.7.22 1.35.19 1.86.11.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.58-.35Zm-5.42 7.1h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.23-.38a9.87 9.87 0 0 1-1.52-5.27c0-5.46 4.45-9.9 9.92-9.9a9.86 9.86 0 0 1 7.01 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.92 9.9Zm8.43-18.34A11.82 11.82 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.6 5.94L.07 24l6.33-1.66a11.85 11.85 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.48-8.39Z" />
      </svg>
    </a>
  );
}

function SiteHeader() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const cartCount = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<Cart>>('/cart');
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition duration-200 ${
      isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface hover:text-ink'
    }`;

  function onSearch(value: string) {
    navigate(value ? `/products?q=${encodeURIComponent(value)}` : '/products');
  }

  return (
    <header className="material-nav sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center gap-3 sm:h-16">
          <BrandMark name={SITE.name} />

          <span className="ml-2 hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted lg:inline-flex">
            <Location className="h-4 w-4 text-accent" />
            Delivering near you
            <span className="text-accent">· 10–15 min</span>
          </span>

          <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Main">
            <NavLink to="/" end className={navLink}>
              Home
            </NavLink>
            <NavLink to="/products" className={navLink}>
              Shop
            </NavLink>
            <NavLink to="/orders" className={navLink}>
              Orders
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              to="/wishlist"
              aria-label="Wishlist"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-muted transition duration-200 hover:bg-accent-soft hover:text-accent active:scale-95"
            >
              <Heart className="h-5 w-5" />
            </Link>
            <Link
              to="/cart"
              aria-label={`Cart${(cartCount.data?.totalQuantity ?? 0) > 0 ? `, ${cartCount.data?.totalQuantity} items` : ''}`}
              className="relative grid h-10 w-10 place-items-center rounded-full text-ink-muted transition duration-200 hover:bg-accent-soft hover:text-accent active:scale-95"
            >
              <Bag2 className="h-5 w-5" />
              {!isLoading && isAuthenticated && (cartCount.data?.totalQuantity ?? 0) > 0 && (
                <span className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount.data?.totalQuantity ?? 0}
                </span>
              )}
            </Link>

            {isLoading ? null : isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="hidden h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-ink-muted transition hover:bg-surface hover:text-ink sm:inline-flex"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={() => void logout()}
                  aria-label="Log out"
                  className="grid h-10 w-10 place-items-center rounded-full text-ink-muted transition duration-200 hover:bg-surface hover:text-ink active:scale-95"
                >
                  <Logout className="h-[18px] w-[18px]" />
                </button>
              </>
            ) : (
              <Link
                to="/profile"
                className="quick-press inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pb-2.5">
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-accent sm:inline-flex">
            <Send className="h-4 w-4" />
            10–15 min
          </span>
          <QuickSearch value={search} onChange={setSearch} onSubmit={onSearch} className="flex-1" />
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const settings = usePublicSettings();
  const legal = usePublicLegal();
  const store = settings.data?.store;
  const social = settings.data?.social;

  const shopLinks = [
    { label: 'Shop all essentials', to: '/products' },
    { label: 'New arrivals', to: '/products?sort=newest' },
    { label: 'Snacks & Drinks', to: '/products/snacks-drinks' },
  ];
  const helpLinks = [
    { label: 'Track your order', to: '/orders' },
    { label: 'My wishlist', to: '/wishlist' },
    { label: 'Cart', to: '/cart' },
    ...(store?.supportEmail
      ? [{ label: store.supportEmail, href: `mailto:${store.supportEmail}` }]
      : []),
    ...(store?.supportPhone
      ? [{ label: store.supportPhone, href: `tel:${store.supportPhone.replace(/\s+/g, '')}` }]
      : []),
  ];
  const legalLinks = LEGAL_LINKS.map((entry) => ({
    label: legal.data?.policies[entry.key]?.title ?? entry.label,
    to: entry.to,
  }));

  const socials = [
    { key: 'instagram', url: social?.instagramUrl, label: 'Instagram', path: INSTAGRAM_PATH },
    { key: 'facebook', url: social?.facebookUrl, label: 'Facebook', path: FACEBOOK_PATH },
    { key: 'youtube', url: social?.youtubeUrl, label: 'YouTube', path: YOUTUBE_PATH },
  ].filter((entry): entry is { key: string; url: string; label: string; path: string } =>
    Boolean(entry.url),
  );

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="border-t border-line bg-surface-warm">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <BrandMark name={store?.name || SITE.name} />
            <p className="mt-2 text-sm text-ink-muted">{store?.tagline || SITE.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {USPS.slice(0, 2).map((usp) => (
                <span
                  key={usp}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-medium text-ink-muted"
                >
                  <Star className="h-3 w-3 text-accent" />
                  {usp}
                </span>
              ))}
            </div>
            {socials.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                {socials.map((entry) => (
                  <a
                    key={entry.key}
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={entry.label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-muted transition hover:border-accent hover:text-accent"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d={entry.path} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 sm:justify-items-end">
            <FooterCol title="Shop" links={shopLinks} />
            <FooterCol title="Help" links={helpLinks} />
            <FooterCol title="Policies" links={legalLinks} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {store?.name || SITE.name}.
            {settings.data?.tax.gstin ? ` GSTIN ${settings.data.tax.gstin}.` : ''} Fresh essentials,
            delivered in minutes.
          </p>
          <button
            onClick={scrollTop}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-accent transition duration-200 hover:bg-accent-soft active:scale-95"
          >
            Back to top
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to?: string; href?: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-eyebrow text-ink">{title}</p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {links.map((link) => (
          <li key={`${link.label}-${link.to ?? link.href ?? ''}`}>
            {link.href ? (
              <a
                href={link.href}
                className="break-all text-ink-muted transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            ) : (
              <Link
                to={link.to ?? '/'}
                className="text-ink-muted transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
