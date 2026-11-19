import type { ReactNode } from 'react';
import { ApiError } from '@/api/http';

/** Whether the API is reachable or configured yet in this phase. */
export function isPhaseStubError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 501;
}

/** Renders a phase-appropriate empty/error state honestly. */
export function PhaseState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      <div className="mt-4 rounded-3xl border border-line bg-surface-warm p-6 text-sm text-ink-muted">
        {children ?? 'This section comes online with the feature phases that follow Phase 1 scaffolding.'}
      </div>
    </section>
  );
}