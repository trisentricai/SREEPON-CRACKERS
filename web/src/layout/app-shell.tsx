import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Heart, LogOut, ShoppingBag, Sparkles, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, Cart } from '@/api/types';
import { ChunkyButton, FunChip, Mascot, StickerBrand, WaveDivider } from '@/components/sticker-ui';
import { SITE } from '@/config/env';
import { useAuth } from '@/features/auth/context/auth-context';

const USPS = [
  'GST invoice on every order',
  'Licensed & insured warehouse',
  'Ships across India in 24–48h',
  'Fresh stock, sealed boxes',
];

const NAV = [
  { label: 'Shop', to: '/products' },
  { label: 'Deals', to: '/deals', hot: true },
  { label: 'Track Order', to: '/orders' },
  { label: 'Wishlist', to: '/wishlist' },
];

/** Public shell: sticker announcement ribbon, header, main outlet, footer. */
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
    <div className="marquee border-b-2 border-ink bg-sunny-400 text-ink" role="note">
      <div className="marquee-track items-center py-1.5 font-display text-xs font-bold uppercase tracking-widest">
        {items.map((text, index) => (
          <span key={index} className="flex items-center gap-2 px-6" aria-hidden={index >= USPS.length}>
            <Sparkles className="h-3 w-3" strokeWidth={3} />
            <span>{text}</span>
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
  const count = cartCount.data?.totalQuantity ?? 0;

  const navPill = ({ isActive }: { isActive: boolean }) =>
    `rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold transition duration-150 ${
      isActive
        ? 'border-ink bg-sunny-400 text-ink shadow-sticker-sm'
        : 'border-transparent text-ink/70 hover:border-ink hover:bg-sunny-100 hover:text-ink'
    }`;

  const iconBtn =
    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-transparent text-ink transition duration-150 hover:border-ink hover:bg-sunny-100 hover:shadow-sticker-sm active:translate-y-0.5 active:shadow-none';

  const badge = count > 0 && (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-coral-500 px-1 font-display text-[10px] font-extrabold text-white">
      {count}
    </span>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b-2 border-ink bg-white/95 backdrop-blur transition-shadow duration-200 ${
        scrolled ? 'shadow-[0_4px_0_0_rgb(36_27_22/0.08)]' : ''
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4">
        <StickerBrand name={SITE.name} />

        <nav className="hidden items-center gap-1.5 lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navPill}>
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {item.hot && (
                  <span className="rounded-full border border-ink bg-coral-500 px-1.5 py-px font-display text-[10px] font-extrabold uppercase text-white">
                    Hot
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link to="/wishlist" className={iconBtn} aria-label="Wishlist">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/cart" className={iconBtn} aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {!isLoading && isAuthenticated && badge}
          </Link>

          {isLoading ? null : isAuthenticated ? (
            <>
              <Link to="/profile" className={`${iconBtn} hidden sm:flex`} aria-label="Profile">
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={() => void logout()}
                className="hidden h-10 items-center gap-2 rounded-full border-2 border-transparent px-3 font-display text-sm font-bold text-ink/70 transition hover:border-ink hover:bg-candy-100 hover:text-ink sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </>
          ) : (
            <ChunkyButton to="/profile" tone="sunny" className="px-5 py-2 text-sm">
              Sign in
            </ChunkyButton>
          )}
        </div>
      </div>

      {/* Mobile chip nav — horizontal scroll pills below the bar. */}
      <nav className="border-t-2 border-ink/10 lg:hidden" aria-label="Sections">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
          <NavLink to="/" end className={navPill}>
            Home
          </NavLink>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navPill}>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {item.label}
                {item.hot && (
                  <span className="rounded-full border border-ink bg-coral-500 px-1.5 py-px font-display text-[10px] font-extrabold uppercase text-white">
                    Hot
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

function SiteFooter() {
  const shopLinks = [
    { label: 'Shop all crackers', to: '/products' },
    { label: "Today's deals", to: '/deals' },
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
    <footer className="mt-16">
      <WaveDivider fill="var(--color-ink)" className="mb-[-1px] bg-transparent" />
      <div className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <StickerBrand name={SITE.name} light />
              <p className="mt-3 max-w-xs font-medium text-white/70">{SITE.tagline} — sparklers, fountains and sky shots for the whole family.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {USPS.slice(0, 2).map((usp) => (
                  <FunChip key={usp} icon={Sparkles} label={usp} tone="white" />
                ))}
              </div>
            </div>

            <FooterCol title="Shop" links={shopLinks} />
            <FooterCol title="Help" links={helpLinks} />
            <FooterCol title="Safety & legal" links={legalLinks} />
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t-2 border-white/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Mascot className="h-12 w-auto" />
              <p className="max-w-md text-xs font-medium text-white/60">
                © {new Date().getFullYear()} {SITE.name}. CE &amp; ISI-compliant stock. Fireworks are age-gated —
                adults must supervise use.
              </p>
            </div>
            <button
              onClick={scrollTop}
              className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-sunny-400 bg-sunny-400 px-4 py-2 font-display text-sm font-bold text-ink transition duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              Back to top
              <ArrowUp className="h-4 w-4" strokeWidth={3} />
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
      <p className="font-display text-sm font-extrabold uppercase tracking-widest text-sunny-400">{title}</p>
      <ul className="mt-3 space-y-2 text-sm font-medium">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-white/70 transition-colors hover:text-sunny-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
