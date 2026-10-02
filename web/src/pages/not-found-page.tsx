import { ChunkyButton, Mascot, StickerCard } from '@/components/sticker-ui';

/** 404 route — playful dead end with a way home. */
export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <StickerCard className="mx-auto max-w-md p-10 text-center">
        <Mascot className="mx-auto h-28 w-auto" />
        <p className="mt-4 font-display text-6xl font-extrabold text-ink">404</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">Lost in the smoke!</h1>
        <p className="mt-1 font-medium text-ink-muted">This rocket fizzled out — the page doesn&apos;t exist.</p>
        <ChunkyButton to="/" tone="sunny" className="mt-6">
          Back to home
        </ChunkyButton>
      </StickerCard>
    </section>
  );
}
