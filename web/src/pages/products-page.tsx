import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type {
  ApiEnvelope,
  CategoryTreeNode,
  Product,
  ProductListResponse,
  ProductSort,
} from '@/api/types';
import { CategoryRail, QuickSearch } from '@/components/quick-commerce-ui';
import {
  EmptyState,
  ErrorState,
  ProductCard,
  ProductGrid,
  ProductGridSkeletonQuick,
} from '@/components/storefront-ui';
import { visibleCategoryTree } from '@/lib/categories';
import { flattenCategories } from '@/lib/quick-commerce';
import { usePageMeta } from '@/lib/seo';

const LIMIT = 30;

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name A–Z' },
];

/**
 * Category / product listing with a Zepto-style category rail, search and
 * sort chips. The list is keyed by URL so category/search changes reset state.
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

  const activeCategory = categorySlug
    ? findCategory(categories.data ?? [], categorySlug)
    : undefined;

  usePageMeta({
    title: activeCategory ? `${activeCategory.name} — everyday essentials` : 'Shop all essentials',
    description: activeCategory
      ? (activeCategory.description ??
        `Buy ${activeCategory.name.toLowerCase()} online from Sreepon. 10–15 min delivery, GST invoice on every order.`)
      : 'Everyday essentials, delivered in 10–15 minutes from a store near you. GST invoice on every order, fresh stock guaranteed and easy returns.',
    path: categorySlug ? `/products/${categorySlug}` : '/products',
  });

  return (
    <section className="mx-auto max-w-6xl px-4 py-4">
      <nav className="text-xs text-ink-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-1.5">/</span>
        <Link to="/products" className="hover:text-accent">
          Shop
        </Link>
        {activeCategory && (
          <>
            <span className="px-1.5">/</span>
            <span className="text-ink">{activeCategory.name}</span>
          </>
        )}
      </nav>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {activeCategory?.name ?? 'All essentials'}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">Delivered fresh in 10–15 minutes.</p>
        </div>
      </div>

      <div className="mt-3">
        <CategoryRail
          categories={flattenCategories(visibleCategoryTree(categories.data ?? []))}
          active={activeCategory?.slug}
        />
      </div>

      <ProductList
        key={`${categorySlug ?? 'all'}:${q}`}
        categorySlug={categorySlug}
        initialQ={q}
        onApplySearch={(term) => {
          setSearchParams(term ? { q: term } : {}, { replace: true });
        }}
      />
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
  const [sort, setSort] = useState<ProductSort>('featured');

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
    return (
      <div className="mt-4">
        <ErrorState error={products.error} />
      </div>
    );
  }

  const items = products.data?.items ?? [];
  const pagination = products.data?.pagination;

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <QuickSearch
          value={draftQ}
          onChange={setDraftQ}
          onSubmit={onApplySearch}
          placeholder="Search by name or SKU…"
          className="flex-1"
        />
        <div className="quick-scroll flex gap-2 overflow-x-auto pb-1" aria-label="Sort products">
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSort(option.value);
                setPage(1);
              }}
              className={`quick-press shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                sort === option.value
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-white text-ink-muted hover:bg-surface'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {products.isLoading ? (
        <div className="mt-4">
          <ProductGridSkeletonQuick count={10} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No products found">
            <p>Try a different search or choose another category.</p>
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="mb-3 mt-4 text-xs text-ink-muted">
            {pagination?.total ?? 0} product{pagination?.total === 1 ? '' : 's'}
            {initialQ && <> matching “{initialQ}”</>}
          </p>
          <ProductGrid>
            {items.map((product: Product) => (
              <ProductCard
                key={product.id}
                product={{ ...product, inStock: (product.inventory?.quantity ?? 0) > 0 }}
              />
            ))}
          </ProductGrid>
          {pagination && pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="quick-press rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 text-xs text-ink-muted">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="quick-press rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
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
