import { Link } from 'react-router-dom';
import { SITE } from '@/config/env';
import { usePageMeta } from '@/lib/seo';

/** 404 route — honest, self-contained. */
export function NotFoundPage() {
  usePageMeta({ title: 'Page not found', noindex: true });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center">
      <p className="text-6xl font-bold text-ember-300">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ember-800">Page not found</h1>
      <p className="mt-2 text-ember-900/60">The page you&apos;re looking for doesn&apos;t exist.</p>
      <p className="mt-1 text-sm text-ember-900/50">Looking for something? Browse the {SITE.name} catalogue.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/products" className="rounded-lg bg-flame-600 px-5 py-2 text-white hover:bg-flame-700">
          Shop green crackers or candles
        </Link>
        <Link to="/" className="rounded-lg border border-flame-300 px-5 py-2 text-flame-700 hover:bg-flame-50">
          Back to home
        </Link>
      </div>
    </section>
  );
}