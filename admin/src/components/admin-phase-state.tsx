import type { ReactNode } from 'react';

/**
 * Admin phase placeholder — used for dashboard modules that arrive in later
 * phases. Renders honestly as a shell state, never faking live data.
 */
export function AdminPhaseState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-lg">
          🚀
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-4 text-sm text-slate-600">
        <p>This module is part of a later phase of the build and is not wired up yet.</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}