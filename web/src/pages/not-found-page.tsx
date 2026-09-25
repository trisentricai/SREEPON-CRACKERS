import { Link } from 'react-router-dom';

/** 404 route — honest, self-contained. */
export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center">
      <p className="text-6xl font-bold text-ember-300">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ember-800">Page not found</h1>
      <p className="mt-2 text-ember-900/60">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-ember-600 px-5 py-2 text-white hover:bg-ember-700">
        Back to home
      </Link>
    </section>
  );
}