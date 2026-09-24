import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  CreateProductInput,
  Product,
  ProductListResponse,
  ProductUnit,
  UpdateProductInput,
} from '@/api/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  Pagination,
  Select,
  Spinner,
  TextInput,
  Toggle,
} from '@/components/admin-ui';
import { formatMoney, slugify } from '@/lib/format';

const LIMIT = 20;

const UNITS: ProductUnit[] = ['BOX', 'PACKET', 'SINGLE', 'OTHER'];

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  basePrice: string;
  mrpPrice: string;
  unit: ProductUnit;
  description: string;
  shortDescription: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
}

const EMPTY_FORM: ProductFormState = {
  name: '',
  slug: '',
  sku: '',
  basePrice: '',
  mrpPrice: '',
  unit: 'BOX',
  description: '',
  shortDescription: '',
  categoryId: '',
  isActive: true,
  isFeatured: false,
};

function toForm(product: Product): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    basePrice: product.basePrice,
    mrpPrice: product.mrpPrice ?? '',
    unit: product.unit,
    description: product.description ?? '',
    shortDescription: product.shortDescription ?? '',
    categoryId: product.category?.id ?? '',
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  };
}

function buildPayload(form: ProductFormState): CreateProductInput {
  return {
    name: form.name,
    slug: form.slug || undefined,
    sku: form.sku,
    basePrice: Number(form.basePrice),
    ...(form.mrpPrice ? { mrpPrice: Number(form.mrpPrice) } : {}),
    unit: form.unit,
    description: form.description || undefined,
    shortDescription: form.shortDescription || undefined,
    categoryId: form.categoryId || null,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
    minimumAge: 18,
  };
}

/** Products — catalog CRUD against the complete backend. */
export function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-products', page, q],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<ProductListResponse>>('/admin/products', {
        params: { page, limit: LIMIT, q: q || undefined },
      });
      return data.data;
    },
  });

  const categories = useQuery({
    queryKey: ['admin-categories-flat'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Array<{ id: string; name: string; slug: string }>>>(
        '/admin/categories',
        { params: { includeInactive: true } },
      );
      return data.data;
    },
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);

  const saveProduct = useMutation({
    mutationFn: async (payload: CreateProductInput) => {
      if (editing) {
        const update: UpdateProductInput = { ...payload };
        const { data } = await apiClient.patch(`/admin/products/${editing.id}`, update);
        return data;
      }
      const { data } = await apiClient.post('/admin/products', payload);
      return data;
    },
    onSuccess: () => {
      void invalidate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Save failed'),
  });

  const toggleActive = useMutation({
    mutationFn: async (product: Product) => {
      const { data } = await apiClient.patch(`/admin/products/${product.id}/visibility`, {
        isActive: !product.isActive,
      });
      return data;
    },
    onSuccess: () => void invalidate(),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/products/${id}`);
    },
    onSuccess: () => void invalidate(),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toForm(product));
    setFormError(null);
    setModalOpen(true);
  }

  function submit() {
    setFormError(null);
    if (!form.name.trim() || !form.sku.trim() || form.basePrice === '') {
      setFormError('Name, SKU, and base price are required.');
      return;
    }
    saveProduct.mutate(buildPayload(form));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your cracker catalog.</p>
        </div>
        <Button onClick={openCreate}>+ New product</Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(search.trim());
        }}
        className="flex max-w-md gap-2"
      >
        <TextInput
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" type="submit">
          Search
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load products'} /></div>}
        {!isLoading && !isError && (!data || data.items.length === 0) && (
          <div className="p-5">
            <EmptyState title={q ? 'No products match your search.' : 'No products yet.'}>
              Use “+ New product” to add your first item.
            </EmptyState>
          </div>
        )}
        {data && data.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{product.category?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-800">{formatMoney(product.basePrice)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {product.inventory ? product.inventory.quantity : 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={product.isActive}
                          label={`Toggle ${product.name} visibility`}
                          onChange={() => toggleActive.mutate(product)}
                        />
                        {!product.isApproved && <Badge tone="amber">Unapproved</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEdit(product)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete "${product.name}"?`)) removeProduct.mutate(product.id);
                          }}
                          disabled={removeProduct.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={data.pagination.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'New product'}
        wide
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))
              }
              placeholder="e.g. 1000-Word Sparkler Box"
            />
          </Field>
          <Field label="SKU">
            <TextInput value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
          </Field>
          <Field label="Slug">
            <TextInput
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generated from name"
            />
          </Field>
          <Field label="Category">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">No category</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Base price (INR)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
            />
          </Field>
          <Field label="MRP (INR)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.mrpPrice}
              onChange={(e) => setForm((f) => ({ ...f, mrpPrice: e.target.value }))}
            />
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value as ProductUnit }))}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-6 pb-2">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              Active
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Toggle checked={form.isFeatured} onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))} />
              Featured
            </div>
          </div>
          <Field label="Short description" hint="Shown on cards and listings.">
            <TextInput
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </Field>
          <Field label="Full description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
            />
          </Field>
        </div>

        {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saveProduct.isPending}>
            {saveProduct.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}