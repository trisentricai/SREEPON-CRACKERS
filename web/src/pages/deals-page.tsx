import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { ApiEnvelope, ProductListResponse } from '@/api/types';
import { ErrorState, ProductGrid, ProductGridSkeleton } from '@/components/storefront-ui';
import {
  ChunkyButton,
  FunHeading,
  Mascot,
  Starburst,
  StickerCard,
  StickerProductCard,
} from '@/components/sticker-ui';
import { discountPercent } from '@/lib/format';

/** Today's deals — discounted products, biggest savings first. */
export function DealsPage() {
  const deals = useQuery({
    queryKey: ['deals-products'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<ProductListResponse>>('/products', {
        params: { page: 1, limit: 60, sort: 'featured' },
      });
      return (data.data.items ?? [])
        .map((product) => ({ product, discount: discountPercent(product.basePrice, product.mrpPrice) ?? 0 }))
        .filter((entry) => entry.discount > 0)
        .sort((a, b) => b.discount - a.discount)
        .map((entry) => entry.product);
    },
  });

  return (
    <div>
      <section className="border-b-2 border-ink bg-grape-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-10">
          <Starburst label="SALE" sub="today" className="animate-wiggle" />
          <div className="min-w-0 flex-1">
            <p className="inline-block -rotate-1 rounded-lg border-2 border-ink bg-white px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-ink shadow-sticker-sm">
              Biggest pops, smallest prices
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold text-ink sm:text-5xl">Today&apos;s deals</h1>
            <p className="mt-1 font-medium text-ink-muted">Every discounted box in one happy place.</p>
          </div>
          <Mascot className="hidden h-28 w-auto sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        {deals.isLoading ? (
          <ProductGridSkeleton />
        ) : deals.isError ? (
          <ErrorState error={deals.error} />
        ) : (deals.data ?? []).length === 0 ? (
          <StickerCard className="flex flex-col items-center gap-4 p-10 text-center">
            <Mascot className="h-24 w-auto" />
            <p className="font-display text-xl font-extrabold text-ink">No deals right now!</p>
            <p className="-mt-2 font-medium text-ink-muted">Poppy is hunting for discounts — check back soon.</p>
            <ChunkyButton to="/products">Browse everything</ChunkyButton>
          </StickerCard>
        ) : (
          <>
            <FunHeading
              title={`${deals.data?.length ?? 0} happy deals`}
              subtitle="Sorted by biggest saving first."
              overline="Fresh today"
            />
            <ProductGrid>
              {(deals.data ?? []).map((product) => (
                <StickerProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          </>
        )}
      </section>
    </div>
  );
}
