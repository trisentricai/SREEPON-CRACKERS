import { Link } from 'react-router-dom';

/** Admin 404. */
export function AdminNotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-5xl font-bold text-slate-300">404</p>
      <h1 className="mt-4 text-xl font-bold text-slate-800">Page not found</h1>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-orange-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}