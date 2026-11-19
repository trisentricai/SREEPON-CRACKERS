import { Link } from 'react-router-dom';
import { SITE } from '@/config/env';
import { usePageMeta } from '@/lib/seo';

/** 404 route — honest, self-contained. */
export function NotFoundPage() {
  usePageMeta({ title: 'Page not found', noindex: true });

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 text-center">
      <p className="text-6xl font-bold text-ember-300">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">Page not found</h1>
      <p className="mt-2 text-ink-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <p className="mt-1 text-sm text-ink-muted">Looking for something? Browse the {SITE.name} catalogue.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/products" className="pill-cta rounded-full bg-accent px-5 py-2 text-white hover:bg-accent/90">
          Shop green crackers or candles
        </Link>
        <Link to="/" className="pill-cta rounded-full border border-flame-300 px-5 py-2 text-accent hover:bg-accent-soft">
          Back to home
        </Link>
      </div>
    </section>
  );
}