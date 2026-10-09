import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  CreateHomepageSectionInput,
  HomepageConfig,
  HomepageConfigResponse,
  HomepageSection,
  HomepageSectionType,
  ProductListResponse,
} from '@/api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Select,
  Spinner,
  TextInput,
  Toggle,
} from '@/components/admin-ui';

/**
 * Storefront homepage composer. Sections are stored on the backend and
 * resolved at request time: some are fully automatic (featured / best sellers /
 * new arrivals / trending / today's offers) and some are hand-curated
 * (product carousel / custom collection).
 */

const SECTION_TYPES: HomepageSectionType[] = [
  'HERO',
  'CATEGORY_GRID',
  'PRODUCT_CAROUSEL',
  'FEATURED_PRODUCTS',
  'BEST_SELLERS',
  'NEW_ARRIVALS',
  'TRENDING_PRODUCTS',
  'TODAYS_OFFERS',
  'PROMOTION',
  'CUSTOM_COLLECTION',
];

const SECTION_TYPE_LABELS: Record<HomepageSectionType, string> = {
  HERO: 'Hero banner',
  CATEGORY_GRID: 'Category grid',
  PRODUCT_CAROUSEL: 'Product carousel (handpicked)',
  FEATURED_PRODUCTS: 'Featured products',
  BEST_SELLERS: 'Best sellers',
  NEW_ARRIVALS: 'New arrivals',
  TRENDING_PRODUCTS: 'Trending products',
  TODAYS_OFFERS: "Today's offers",
  PROMOTION: 'Promotion banners',
  CUSTOM_COLLECTION: 'Custom collection (handpicked)',
};

const SECTION_TYPE_HINTS: Partial<Record<HomepageSectionType, string>> = {
  TRENDING_PRODUCTS: 'Best sellers from the last 30 days, falling back to all-time best sellers.',
  TODAYS_OFFERS: 'Products currently on discount (MRP above the selling price), biggest saving first.',
  BEST_SELLERS: 'Ranked by total units ordered.',
  NEW_ARRIVALS: 'Newest products first.',
  FEATURED_PRODUCTS: 'Products flagged as featured in the catalogue.',
  PRODUCT_CAROUSEL: 'A handpicked, ordered list of products.',
  CUSTOM_COLLECTION: 'A handpicked, ordered list of products.',
  CATEGORY_GRID: 'Root categories from the catalogue.',
  HERO: 'The large home hero banner slot.',
  PROMOTION: 'Home middle / secondary / bottom promo banners.',
};

/** Section types whose products are picked by hand rather than auto-resolved. */
const PRODUCT_TYPES = new Set<HomepageSectionType>(['PRODUCT_CAROUSEL', 'CUSTOM_COLLECTION']);
/** Section types that resolve a limit-based list of products. */
const LIMIT_TYPES = new Set<HomepageSectionType>([
  'FEATURED_PRODUCTS',
  'BEST_SELLERS',
  'NEW_ARRIVALS',
  'TRENDING_PRODUCTS',
  'TODAYS_OFFERS',
  'PRODUCT_CAROUSEL',
  'CUSTOM_COLLECTION',
]);

interface SectionFormState {
  type: HomepageSectionType;
  title: string;
  limit: string;
  productIds: string[];
  displayOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: SectionFormState = {
  type: 'TRENDING_PRODUCTS',
  title: '',
  limit: '8',
  productIds: [],
  displayOrder: '0',
  isActive: true,
};

function toForm(section: HomepageSection): SectionFormState {
  const config = section.config ?? {};
  const limit = typeof config.limit === 'number' ? String(config.limit) : '8';
  const productIds = Array.isArray(config.productIds)
    ? config.productIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    type: section.type,
    title: section.title ?? '',
    limit,
    productIds,
    displayOrder: String(section.displayOrder),
    isActive: section.isActive,
  };
}

function buildPayload(form: SectionFormState): CreateHomepageSectionInput {
  const config: Record<string, unknown> = {};
  if (LIMIT_TYPES.has(form.type)) {
    const limit = Number(form.limit);
    if (Number.isFinite(limit) && limit > 0) config.limit = Math.floor(limit);
  }
  if (PRODUCT_TYPES.has(form.type)) config.productIds = form.productIds;

  const displayOrder = Number(form.displayOrder);
  return {
    type: form.type,
    ...(form.title.trim() ? { title: form.title.trim() } : {}),
    ...(Object.keys(config).length > 0 ? { config } : {}),
    displayOrder: Number.isFinite(displayOrder) && displayOrder >= 0 ? Math.floor(displayOrder) : 0,
    isActive: form.isActive,
  };
}

/** Hero copy form. Remounted by its parent whenever the server config changes. */
function HeroCopyForm({ initial }: { initial: HomepageConfig }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<HomepageConfig>(initial);
  const [saved, setSaved] = useState(false);

  const saveConfig = useMutation({
    mutationFn: async (payload: HomepageConfig) => {
      await apiClient.put('/admin/homepage', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-homepage-config'] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="mt-4 space-y-4">
      <Field label="Hero title">
        <TextInput
          value={draft.heroTitle ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, heroTitle: e.target.value }))}
          placeholder="Festival crackers, delivered safely"
        />
      </Field>
      <Field label="Hero tagline">
        <TextInput
          value={draft.heroTagline ?? ''}
          onChange={(e) => setDraft((prev) => ({ ...prev, heroTagline: e.target.value }))}
          placeholder="Licensed stock · 24–48h dispatch · GST invoice"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button onClick={() => saveConfig.mutate(draft)} disabled={saveConfig.isPending}>
          {saveConfig.isPending ? 'Saving…' : 'Save hero copy'}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        {saveConfig.isError && (
          <span className="text-sm text-red-600">
            {saveConfig.error instanceof Error ? saveConfig.error.message : 'Save failed'}
          </span>
        )}
      </div>
    </div>
  );
}

/** Hero copy stored in the `homepage` SiteSetting. */
function HomepageSettingsCard() {
  const configQuery = useQuery({
    queryKey: ['admin-homepage-config'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<HomepageConfigResponse>>('/admin/homepage');
      return data.data.config;
    },
  });

  const config: HomepageConfig = {
    ...(configQuery.data ?? {}),
    heroTitle: typeof configQuery.data?.heroTitle === 'string' ? configQuery.data.heroTitle : '',
    heroTagline: typeof configQuery.data?.heroTagline === 'string' ? configQuery.data.heroTagline : '',
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-800">Hero copy</h2>
      <p className="mt-1 text-sm text-slate-500">Optional headline shown above the storefront sections.</p>
      {configQuery.isLoading ? (
        <Spinner />
      ) : configQuery.isError ? (
        <div className="mt-4">
          <ErrorState message={configQuery.error instanceof Error ? configQuery.error.message : 'Failed to load config'} />
        </div>
      ) : (
        <HeroCopyForm key={configQuery.dataUpdatedAt} initial={config} />
      )}
    </Card>
  );
}

export function HomepagePage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HomepageSection | null>(null);
  const [form, setForm] = useState<SectionFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const sectionsQuery = useQuery({
    queryKey: ['admin-homepage-sections'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<HomepageSection[]>>('/admin/homepage/sections');
      return data.data;
    },
  });

  const productsQuery = useQuery({
    queryKey: ['admin-homepage-products', search],
    enabled: modalOpen && PRODUCT_TYPES.has(form.type),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProductListResponse>>('/admin/products', {
        params: { page: 1, limit: 50, q: search.trim() || undefined },
      });
      return data.data.items;
    },
  });

  const invalidateSections = () => void queryClient.invalidateQueries({ queryKey: ['admin-homepage-sections'] });

  const saveSection = useMutation({
    mutationFn: async (payload: CreateHomepageSectionInput) => {
      if (editing) {
        await apiClient.patch(`/admin/homepage/sections/${editing.id}`, payload);
        return;
      }
      await apiClient.post('/admin/homepage/sections', payload);
    },
    onSuccess: () => {
      invalidateSections();
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Save failed'),
  });

  const removeSection = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/homepage/sections/${id}`);
    },
    onSuccess: () => invalidateSections(),
  });

  const toggleActive = useMutation({
    mutationFn: async (section: HomepageSection) => {
      await apiClient.patch(`/admin/homepage/sections/${section.id}`, { isActive: !section.isActive });
    },
    onSuccess: () => invalidateSections(),
  });

  const reorder = useMutation({
    mutationFn: async (items: Array<{ id: string; displayOrder: number }>) => {
      await apiClient.patch('/admin/homepage/sections/reorder', { items });
    },
    onSuccess: () => invalidateSections(),
  });

  const sections = sectionsQuery.data ?? [];

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, displayOrder: String(sections.length) });
    setFormError(null);
    setSearch('');
    setModalOpen(true);
  }

  function openEdit(section: HomepageSection) {
    setEditing(section);
    setForm(toForm(section));
    setFormError(null);
    setSearch('');
    setModalOpen(true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target]!, next[index]!];
    reorder.mutate(next.map((section, i) => ({ id: section.id, displayOrder: i })));
  }

  function toggleProduct(id: string) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((existing) => existing !== id)
        : [...prev.productIds, id],
    }));
  }

  function submit() {
    setFormError(null);
    if (PRODUCT_TYPES.has(form.type) && form.productIds.length === 0) {
      setFormError('Pick at least one product for this section.');
      return;
    }
    saveSection.mutate(buildPayload(form));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Homepage</h1>
          <p className="mt-1 text-sm text-slate-500">
            Compose the tabs shoppers see on the web and app home pages.
          </p>
        </div>
        <Button onClick={openCreate}>+ New section</Button>
      </div>

      <HomepageSettingsCard />

      <Card className="overflow-hidden p-0">
        {sectionsQuery.isLoading && <Spinner />}
        {sectionsQuery.isError && (
          <div className="p-5">
            <ErrorState
              message={sectionsQuery.error instanceof Error ? sectionsQuery.error.message : 'Failed to load sections'}
            />
          </div>
        )}
        {!sectionsQuery.isLoading && !sectionsQuery.isError && sections.length === 0 && (
          <div className="p-5">
            <EmptyState title="No sections yet.">
              Add a section such as Trending products or Today&apos;s offers to build the home page.
            </EmptyState>
          </div>
        )}
        {sections.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Config</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => {
                const config = section.config ?? {};
                const limit = typeof config.limit === 'number' ? config.limit : null;
                const productIds = Array.isArray(config.productIds) ? config.productIds.length : 0;
                return (
                  <tr key={section.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => move(index, -1)}
                          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={index === sections.length - 1 || reorder.isPending}
                          onClick={() => move(index, 1)}
                          className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{section.title ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="orange">{SECTION_TYPE_LABELS[section.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {limit !== null ? `limit ${limit}` : ''}
                      {limit !== null && productIds > 0 ? ' · ' : ''}
                      {productIds > 0 ? `${productIds} product(s)` : ''}
                      {limit === null && productIds === 0 ? '—' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <Toggle
                        checked={section.isActive}
                        label={`Toggle ${section.title ?? section.type}`}
                        onChange={() => toggleActive.mutate(section)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => openEdit(section)}>
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          disabled={removeSection.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete “${section.title ?? SECTION_TYPE_LABELS[section.type]}”?`)) {
                              removeSection.mutate(section.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit section' : 'New section'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <div className="space-y-4">
          {formError && <ErrorState message={formError} />}

          <Field label="Type" hint={SECTION_TYPE_HINTS[form.type]}>
            <Select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as HomepageSectionType }))}
            >
              {SECTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Title" hint="Shown as the section heading. Leave blank for the default.">
            <TextInput
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={SECTION_TYPE_LABELS[form.type]}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {LIMIT_TYPES.has(form.type) && (
              <Field label="Limit" hint="Max products to show.">
                <TextInput
                  type="number"
                  min={1}
                  value={form.limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, limit: e.target.value }))}
                />
              </Field>
            )}
            <Field label="Display order">
              <TextInput
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
              />
            </Field>
          </div>

          {PRODUCT_TYPES.has(form.type) && (
            <Field label="Products" hint="Selected products appear in the order you pick them.">
              <div className="space-y-2">
                <TextInput
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                  {productsQuery.isLoading && (
                    <div className="p-3">
                      <Spinner label="Loading products…" />
                    </div>
                  )}
                  {productsQuery.data?.map((product) => {
                    const selectedIndex = form.productIds.indexOf(product.id);
                    const isSelected = selectedIndex >= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                          isSelected ? 'bg-flame-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate text-slate-700">{product.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {isSelected ? `#${selectedIndex + 1}` : '+'}
                        </span>
                      </button>
                    );
                  })}
                  {productsQuery.data && productsQuery.data.length === 0 && (
                    <p className="p-3 text-sm text-slate-400">No products match.</p>
                  )}
                </div>
                {form.productIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.productIds.map((id) => {
                      const product = productsQuery.data?.find((p) => p.id === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleProduct(id)}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                        >
                          {product?.name ?? id.slice(0, 8)}
                          <span aria-hidden>✕</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Field>
          )}

          <div className="flex items-center gap-3">
            <Toggle checked={form.isActive} onChange={(next) => setForm((prev) => ({ ...prev, isActive: next }))} />
            <span className="text-sm text-slate-600">Active on the storefront</span>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saveSection.isPending}>
              {saveSection.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create section'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
