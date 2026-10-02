import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, CategoryTreeNode, Product, ProductListResponse, ProductSort } from '@/api/types';
import { ErrorState, ProductGrid, ProductGridSkeleton } from '@/components/storefront-ui';
import { ChunkyButton, Mascot, StickerCard, StickerProductCard } from '@/components/sticker-ui';

const LIMIT = 24;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name A–Z' },
];

/**
 * Category / product listing with search, sort, and pagination.
 * The category rail and result grid are keyed by the URL so navigating between
 * categories or searches naturally resets list-local state (page, term, sort).
 */
export function ProductsPage() {
  const params = useParams();
  const categorySlug = params.categorySlug;
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const categories = useQuery({
    queryKey: ['public-categories-tree'],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<CategoryTreeNode[]>>('/categories/tree');
      return data.data;
    },
  });

  const activeCategory = categorySlug ? findCategory(categories.data ?? [], categorySlug) : undefined;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <header>
        <p className="text-sm font-bold">
          <Link
            to="/products"
            className="inline-block rounded-full border-2 border-ink bg-white px-3 py-0.5 text-ink shadow-sticker-sm transition hover:bg-sunny-100"
          >
            Catalogue
          </Link>
          {activeCategory && <span className="ml-2 text-ink-muted">/ {activeCategory.name}</span>}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {activeCategory?.name ?? 'Shop the fun'}
        </h1>
        <p className="mt-1 font-medium text-ink-muted">All items are age-gated; shop responsibly.</p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-widest text-ink">Categories</p>
          <CategoryRail categories={categories.data ?? []} active={activeCategory?.slug} />
        </aside>

        <ProductList
          key={`${categorySlug ?? 'all'}:${q}`}
          categorySlug={categorySlug}
          initialQ={q}
          onApplySearch={(term) => {
            setSearchParams(term ? { q: term } : {}, { replace: true });
          }}
        />
      </div>
    </section>
  );
}

function ProductList({
  categorySlug,
  initialQ,
  onApplySearch,
}: {
  categorySlug?: string;
  initialQ: string;
  onApplySearch: (term: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [draftQ, setDraftQ] = useState(initialQ);
  const [sort, setSort] = useState<ProductSort>('newest');

  const products = useQuery({
    queryKey: ['public-products', categorySlug, page, initialQ, sort],
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<ProductListResponse>>('/products', {
        params: { page, limit: LIMIT, q: initialQ || undefined, category: categorySlug, sort },
      });
      return data.data;
    },
  });

  if (products.isError) {
    return <ErrorState error={products.error} />;
  }

  const items = products.data?.items ?? [];
  const pagination = products.data?.pagination;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onApplySearch(draftQ.trim());
          }}
        >
          <input
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-medium shadow-sticker-sm placeholder:text-ink-muted/70 focus:outline-none"
          />
          <ChunkyButton type="submit" tone="sunny" className="shrink-0 px-5 py-2 text-sm">
            Search
          </ChunkyButton>
        </form>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ProductSort);
              setPage(1);
            }}
            className="rounded-full border-2 border-ink bg-white px-3 py-2 text-sm font-bold shadow-sticker-sm"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        {products.isLoading ? (
          <ProductGridSkeleton />
        ) : items.length === 0 ? (
          <StickerCard className="flex flex-col items-center gap-3 p-10 text-center">
            <Mascot className="h-20 w-auto" />
            <p className="font-display text-xl font-extrabold text-ink">No pops found!</p>
            <p className="-mt-1 font-medium text-ink-muted">Try a different search or choose another category.</p>
          </StickerCard>
        ) : (
          <>
            <p className="mb-4">
              <span className="inline-block rounded-full border-2 border-ink bg-bubble-100 px-3 py-1 text-xs font-bold text-ink shadow-sticker-sm">
                {pagination?.total ?? 0} pop{pagination?.total === 1 ? '' : 's'}
                {initialQ && <> for “{initialQ}”</>}
              </span>
            </p>
            <ProductGrid>
              {items.map((product: Product) => (
                <StickerProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
            {pagination && pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold shadow-sticker-sm transition hover:bg-sunny-100 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
                >
                  ← Prev
                </button>
                <span className="rounded-full border-2 border-ink bg-sunny-100 px-3 py-1 text-sm font-bold">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-sm font-bold shadow-sticker-sm transition hover:bg-sunny-100 active:translate-y-0.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function findCategory(tree: CategoryTreeNode[], slug: string): CategoryTreeNode | undefined {
  for (const node of tree) {
    if (node.slug === slug) return node;
    const child = findCategory(node.children ?? [], slug);
    if (child) return child;
  }
  return undefined;
}

function CategoryRail({ categories, active }: { categories: CategoryTreeNode[]; active?: string }) {
  return (
    <ul className="space-y-2 text-sm font-bold">
      <li>
        <Link
          to="/products"
          className={`block rounded-full border-2 px-4 py-2 transition ${
            !active
              ? 'border-ink bg-sunny-400 text-ink shadow-sticker-sm'
              : 'border-transparent text-ink/70 hover:border-ink hover:bg-sunny-100 hover:text-ink'
          }`}
        >
          All products
        </Link>
      </li>
      {categories.map((category) => (
        <CategoryBranch key={category.id} category={category} active={active} depth={0} />
      ))}
    </ul>
  );
}

function CategoryBranch({
  category,
  active,
  depth,
}: {
  category: CategoryTreeNode;
  active?: string;
  depth: number;
}) {
  const children = category.children ?? [];
  return (
    <>
      <li>
        <Link
          to={`/products/${category.slug}`}
          style={{ marginLeft: `${depth * 12}px` }}
          className={`block rounded-full border-2 px-4 py-2 transition ${
            active === category.slug
              ? 'border-ink bg-sunny-400 text-ink shadow-sticker-sm'
              : 'border-transparent text-ink/70 hover:border-ink hover:bg-sunny-100 hover:text-ink'
          }`}
        >
          {category.name}
        </Link>
      </li>
      {children.map((child) => (
        <CategoryBranch key={child.id} category={child} active={active} depth={depth + 1} />
      ))}
    </>
  );
}
