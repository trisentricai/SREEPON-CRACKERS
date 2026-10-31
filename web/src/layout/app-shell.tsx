import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Bag2, Heart, Logout, Star, User } from 'react-iconly';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { BrandMark } from '@/components/storefront-ui';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';
import { LEGAL_LINKS } from '@/lib/legal';
import { usePublicLegal, usePublicSettings } from '@/lib/queries';

const USPS = [
  'GST invoice on every order',
  'Licensed & insured warehouse',
  'Ships across India in 24–48h',
  'Fresh stock, sealed boxes',
];

/** Brand glyphs (inline SVG paths, 24×24) for the footer social row. */
const INSTAGRAM_PATH =
  'M12 2.2c3.2 0 3.6 0 4.9.07 1.2.06 1.8.25 2.2.42.6.22 1 .48 1.4.9.42.42.68.82.9 1.4.17.4.36 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.06 1.2-.25 1.8-.42 2.2-.22.6-.48 1-.9 1.4-.42.42-.82.68-1.4.9-.4.17-1 .36-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.06-1.8-.25-2.2-.42a3.9 3.9 0 0 1-1.4-.9 3.9 3.9 0 0 1-.9-1.4c-.17-.4-.36-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.06-1.2.25-1.8.42-2.2.22-.6.48-1 .9-1.4.42-.42.82-.68 1.4-.9.4-.17 1-.36 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4Zm0 2.2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm6.4-2.6a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Z';
const FACEBOOK_PATH =
  'M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.3-.04-1.3-.13-2.45-.13-2.4 0-4.05 1.47-4.05 4.17V9.9H7.5V13h2.7v8h3.3Z';
const YOUTUBE_PATH =
  'M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z';

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
      <WhatsAppFab />
    </div>
  );
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
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-flame-600 text-white shadow-pop transition duration-200 hover:-translate-y-0.5 hover:bg-flame-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-700 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.46s1.06 2.86 1.2 3.06c.15.2 2.07 3.17 5.02 4.44.7.3 1.25.48 1.68.62.7.22 1.35.19 1.86.11.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.41-.08-.13-.28-.2-.58-.35Zm-5.42 7.1h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.23-.38a9.87 9.87 0 0 1-1.52-5.27c0-5.46 4.45-9.9 9.92-9.9a9.86 9.86 0 0 1 7.01 2.9 9.83 9.83 0 0 1 2.9 7c0 5.46-4.45 9.9-9.92 9.9Zm8.43-18.34A11.82 11.82 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.6 5.94L.07 24l6.33-1.66a11.85 11.85 0 0 0 5.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.48-8.39Z" />
      </svg>
    </a>
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
  const settings = usePublicSettings();
  const legal = usePublicLegal();
  const store = settings.data?.store;
  const social = settings.data?.social;

  const shopLinks = [
    { label: 'Shop all green crackers or candles', to: '/products' },
    { label: 'New arrivals', to: '/products?sort=newest' },
    { label: 'Gift boxes', to: '/products/gift-boxes' },
  ];
  const helpLinks = [
    { label: 'Track your order', to: '/orders' },
    { label: 'My wishlist', to: '/wishlist' },
    { label: 'Cart', to: '/cart' },
    ...(store?.supportEmail ? [{ label: store.supportEmail, href: `mailto:${store.supportEmail}` }] : []),
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
  ].filter((entry): entry is { key: string; url: string; label: string; path: string } => Boolean(entry.url));

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-16 border-t border-ember-100 bg-gradient-to-b from-ember-50 to-ember-100/60">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <BrandMark name={store?.name || SITE.name} />
            <p className="mt-3 max-w-xs text-sm text-ember-900/70">{store?.tagline || SITE.tagline}</p>
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
            {socials.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {socials.map((entry) => (
                  <a
                    key={entry.key}
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={entry.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-ember-200 bg-paper-strong text-ember-900/70 transition hover:border-flame-300 hover:text-flame-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d={entry.path} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          <FooterCol title="Shop" links={shopLinks} />
          <FooterCol title="Help" links={helpLinks} />
          <FooterCol title="Policies" links={legalLinks} />
        </div>

        <div className="mt-10 border-t border-ember-200/70 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ember-900/60">
              © {new Date().getFullYear()} {store?.name || SITE.name}.
              {settings.data?.tax.gstin ? ` GSTIN ${settings.data.tax.gstin}.` : ''} Fireworks are age-gated — adults
              must supervise use.
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

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to?: string; href?: string }>;
}) {
  return (
    <div>
      <p className="font-display text-sm font-bold uppercase tracking-eyebrow text-ember-800">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map((link) => (
          <li key={`${link.label}-${link.to ?? link.href ?? ''}`}>
            {link.href ? (
              <a href={link.href} className="break-all text-ember-900/70 transition-colors hover:text-flame-600">
                {link.label}
              </a>
            ) : (
              <Link to={link.to ?? '/'} className="text-ember-900/70 transition-colors hover:text-flame-600">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}