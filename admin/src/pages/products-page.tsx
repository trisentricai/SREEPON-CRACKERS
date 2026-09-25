import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  CreateProductInput,
  Product,
  ProductImage,
  ProductListResponse,
  ProductUnit,
  SignedUpload,
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

interface ProductImageEntry {
  id?: string;
  url: string;
  cloudinaryPublicId?: string;
}

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
  images: ProductImageEntry[];
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
  images: [],
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
    images: product.images.map((image) => ({ id: image.id, url: image.url })),
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

function buildImages(form: ProductFormState): CreateProductInput['images'] {
  return form.images.map((image) => ({
    url: image.url,
    ...(image.cloudinaryPublicId ? { cloudinaryPublicId: image.cloudinaryPublicId } : {}),
  }));
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  /** Attach/remove images on edit via the per-image admin endpoints. */
  async function persistImages(productId: string, original: ProductImage[], next: ProductImageEntry[]) {
    const kept = new Set(next.map((image) => image.id).filter((id): id is string => Boolean(id)));
    await Promise.all(
      original
        .filter((image) => !kept.has(image.id))
        .map((image) => apiClient.delete(`/admin/products/${productId}/images/${image.id}`)),
    );
    for (const image of next) {
      if (image.id) continue;
      await apiClient.post(`/admin/products/${productId}/images`, {
        url: image.url,
        cloudinaryPublicId: image.cloudinaryPublicId,
      });
    }
  }

  const saveProduct = useMutation({
    mutationFn: async (payload: CreateProductInput) => {
      if (editing) {
        const { data } = await apiClient.patch(`/admin/products/${editing.id}`, payload);
        await persistImages(editing.id, editing.images, form.images);
        return data;
      }
      const { data } = await apiClient.post('/admin/products', { ...payload, images: buildImages(form) });
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
    setUploadError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toForm(product));
    setFormError(null);
    setUploadError(null);
    setModalOpen(true);
  }

  /** Sign an upload on the backend, push bytes straight to Cloudinary, append the URL. */
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be 5 MB or smaller.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const { data } = await apiClient.post<ApiEnvelope<SignedUpload>>('/admin/media/sign', {
        folder: 'sripon/products',
        resourceType: 'image',
      });
      const signature = data.data;
      const body = new FormData();
      body.append('file', file);
      body.append('api_key', signature.apiKey);
      body.append('timestamp', String(signature.timestamp));
      body.append('folder', signature.folder);
      body.append('signature', signature.signature);
      const upload = await axios.post<{ secure_url: string; public_id: string }>(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
        body,
      );
      setForm((f) => ({
        ...f,
        images: [...f.images, { url: upload.data.secure_url, cloudinaryPublicId: upload.data.public_id }],
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? `Upload failed: ${err.message}` : 'Upload failed');
    } finally {
      setUploading(false);
    }
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
                      <div className="flex items-center gap-3">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0].url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
                            —
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{product.name}</p>
                          <p className="text-xs text-slate-400">{product.unit}</p>
                        </div>
                      </div>
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

        <div className="mt-4">
          <Field label="Product images" hint="Upload photos of the product — the first one is used as the cover. 5 MB max each.">
            <div className="flex flex-wrap items-start gap-3">
              {form.images.map((image, index) => (
                <div
                  key={image.id ?? image.url}
                  className="relative h-24 w-24 overflow-hidden rounded-lg border border-slate-200"
                >
                  <img src={image.url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
                    }
                    className="absolute right-1 top-1 rounded-md bg-red-600 px-1.5 py-0.5 text-xs text-white hover:bg-red-700"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-36 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 transition-colors hover:border-orange-400 hover:text-orange-600">
                {uploading ? 'Uploading…' : '+ Add image'}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </div>
            {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
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