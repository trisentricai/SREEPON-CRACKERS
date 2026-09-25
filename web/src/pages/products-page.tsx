import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { ApiEnvelope, CategoryTreeNode, Product, ProductListResponse, ProductSort } from '@/api/types';
import { EmptyState, ErrorState, ProductCard, ProductGrid, Spinner } from '@/components/storefront-ui';

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
        <p className="text-sm text-ember-900/50">
          <Link to="/products" className="hover:text-ember-700">Catalogue</Link>
          {activeCategory && <span className="text-ember-900/40"> / {activeCategory.name}</span>}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ember-800">
          {activeCategory?.name ?? 'Shop crackers &amp; fireworks'}
        </h1>
        <p className="mt-1 text-sm text-ember-900/50">All items are age-gated; shop responsibly.</p>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-3 text-sm font-semibold text-ember-800">Categories</p>
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
            className="w-full rounded-lg border border-ember-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-ember-600 px-4 py-2 text-sm text-white hover:bg-ember-700">
            Search
          </button>
        </form>
        <label className="flex items-center gap-2 text-sm text-ember-900/70">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as ProductSort);
              setPage(1);
            }}
            className="rounded-lg border border-ember-200 px-3 py-2 text-sm"
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
          <Spinner label="Loading products…" />
        ) : items.length === 0 ? (
          <EmptyState title="No products found">
            <p>Try a different search or choose another category.</p>
          </EmptyState>
        ) : (
          <>
            <p className="mb-4 text-sm text-ember-900/50">
              {pagination?.total ?? 0} product{pagination?.total === 1 ? '' : 's'}
              {initialQ && <> matching “{initialQ}”</>}
            </p>
            <ProductGrid>
              {items.map((product: Product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
            {pagination && pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-ember-200 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 text-sm text-ember-900/60">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-ember-200 px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Next
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
    <ul className="space-y-1 text-sm">
      <li>
        <Link
          to="/products"
          className={`block rounded-lg px-3 py-2 ${!active ? 'bg-ember-100 font-semibold text-ember-800' : 'text-ember-900/70 hover:bg-ember-50'}`}
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
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          className={`block rounded-lg py-2 pr-3 ${active === category.slug ? 'bg-ember-100 font-semibold text-ember-800' : 'text-ember-900/70 hover:bg-ember-50'}`}
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