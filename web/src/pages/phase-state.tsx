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
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ember-800">{title}</h1>
      <div className="mt-4 rounded-xl border border-ember-100 bg-ember-50/60 p-6 text-sm text-ember-900/70">
        {children ?? 'This section comes online with the feature phases that follow Phase 1 scaffolding.'}
      </div>
    </section>
  );
}