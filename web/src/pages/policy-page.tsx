import { Link, useParams } from 'react-router-dom';
import { ErrorState, Skeleton } from '@/components/storefront-ui';
import { LEGAL_LINKS } from '@/lib/legal';
import { usePublicLegal, usePublicSettings } from '@/lib/queries';

/** Renders admin-authored policy text as paragraphs, preserving single line breaks. */
function PolicyBody({ body, supportEmail }: { body: string; supportEmail?: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ember-200 bg-ember-50/60 p-6 text-sm text-ember-900/70">
        <p>This policy is being finalised.</p>
        <p className="mt-2">
          In the meantime, contact us at{' '}
          {supportEmail ? (
            <a className="font-medium text-flame-600 underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          ) : (
            'our support team'
          )}{' '}
          and we&apos;ll answer any question about it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm leading-relaxed text-ember-900/80">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/** `/policies/:policyKey` — one policy page. */
export function PolicyPage() {
  const { policyKey } = useParams<{ policyKey: string }>();
  const legal = usePublicLegal();
  const settings = usePublicSettings();

  if (legal.isLoading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-5/6" />
        <Skeleton className="mt-3 h-4 w-4/6" />
      </section>
    );
  }

  if (legal.isError) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState error={legal.error} />
      </section>
    );
  }

  const policy = policyKey ? legal.data?.policies[policyKey] : undefined;

  if (!policy) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ember-800">Policy not found</h1>
        <p className="mt-2 text-sm text-ember-900/70">
          We couldn&apos;t find that page. Browse our{' '}
          <Link className="font-medium text-flame-600 underline" to="/policies">
            policies
          </Link>{' '}
          instead.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Policies" className="text-sm">
          <p className="font-display text-xs font-bold uppercase tracking-eyebrow text-ember-800">Policies</p>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((entry) => (
              <li key={entry.key}>
                <Link
                  to={entry.to}
                  className={`transition-colors hover:text-flame-600 ${
                    entry.key === policyKey ? 'font-semibold text-flame-600' : 'text-ember-900/70'
                  }`}
                >
                  {legal.data?.policies[entry.key]?.title ?? entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article>
          <h1 className="text-2xl font-bold text-ember-800">{policy.title}</h1>
          <div className="mt-6">
            <PolicyBody body={policy.body} supportEmail={settings.data?.store.supportEmail} />
          </div>
          <p className="mt-8 text-xs text-ember-900/50">
            Questions? See our{' '}
            <Link className="font-medium text-flame-600 underline" to="/policies">
              other policies
            </Link>{' '}
            or contact support.
          </p>
        </article>
      </div>
    </section>
  );
}

/** `/policies` — index of every policy page. */
export function PoliciesIndexPage() {
  const legal = usePublicLegal();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ember-800">Policies &amp; terms</h1>
      <p className="mt-2 text-sm text-ember-900/70">
        Everything about ordering, delivery, returns and how we handle your data.
      </p>

      {legal.isLoading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : legal.isError ? (
        <div className="mt-8">
          <ErrorState error={legal.error} />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ember-100 overflow-hidden rounded-xl border border-ember-100">
          {LEGAL_LINKS.map((entry) => (
            <li key={entry.key}>
              <Link
                to={entry.to}
                className="flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-flame-50"
              >
                <span className="font-medium text-ember-900">
                  {legal.data?.policies[entry.key]?.title ?? entry.label}
                </span>
                <span aria-hidden className="text-flame-600">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
