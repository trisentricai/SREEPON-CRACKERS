import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  Banner,
  BannerActionType,
  BannerListResponse,
  BannerPlacement,
  CreateBannerInput,
} from '@/api/types';
import {
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
import { titleCase } from '@/lib/format';

const LIMIT = 20;

const PLACEMENTS: BannerPlacement[] = [
  'HOME_HERO',
  'HOME_SECONDARY',
  'HOME_MIDDLE',
  'HOME_BOTTOM',
  'CATEGORY_TOP',
  'PRODUCT_PROMOTION',
  'APP_HOME',
];

const ACTION_TYPES: BannerActionType[] = ['LINKED_PRODUCT', 'LINKED_CATEGORY', 'CUSTOM_URL'];

interface BannerFormState {
  placement: BannerPlacement;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionType: BannerActionType;
  actionTarget: string;
  categoryId: string;
  displayOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: BannerFormState = {
  placement: 'HOME_HERO',
  title: '',
  subtitle: '',
  imageUrl: '',
  actionType: 'CUSTOM_URL',
  actionTarget: '',
  categoryId: '',
  displayOrder: '0',
  isActive: true,
};

function toForm(banner: Banner): BannerFormState {
  return {
    placement: banner.placement,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl,
    actionType: banner.actionType,
    actionTarget: banner.actionTarget ?? '',
    categoryId: banner.category?.id ?? '',
    displayOrder: banner.displayOrder.toString(),
    isActive: banner.isActive,
  };
}

function buildPayload(form: BannerFormState): CreateBannerInput {
  return {
    placement: form.placement,
    title: form.title,
    subtitle: form.subtitle || undefined,
    imageUrl: form.imageUrl,
    actionType: form.actionType,
    actionTarget: form.actionType === 'LINKED_CATEGORY' ? undefined : form.actionTarget || undefined,
    categoryId: form.actionType === 'LINKED_CATEGORY' ? form.categoryId || undefined : undefined,
    displayOrder: Number(form.displayOrder) || 0,
    isActive: form.isActive,
  };
}

/** Banners — promo imagery for storefront placements. */
export function BannersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-banners', page],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<BannerListResponse>>('/admin/banners', {
        params: { page, limit: LIMIT },
      });
      return data.data;
    },
  });

  const categories = useQuery({
    queryKey: ['admin-categories-banner'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Array<{ id: string; name: string; slug: string }>>>('/admin/categories', {
        params: { includeInactive: true },
      });
      return data.data;
    },
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-banners'] });

  const saveBanner = useMutation({
    mutationFn: async (payload: CreateBannerInput) => {
      if (editing) {
        const { data } = await apiClient.patch(`/admin/banners/${editing.id}`, payload);
        return data;
      }
      const { data } = await apiClient.post('/admin/banners', payload);
      return data;
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditing(null);
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Save failed'),
  });

  const removeBanner = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/banners/${id}`);
    },
    onSuccess: () => invalidate(),
  });

  const toggleActive = useMutation({
    mutationFn: async (banner: Banner) => {
      const { data } = await apiClient.patch(`/admin/banners/${banner.id}`, { isActive: !banner.isActive });
      return data;
    },
    onSuccess: () => invalidate(),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setForm(toForm(banner));
    setFormError(null);
    setModalOpen(true);
  }

  function submit() {
    setFormError(null);
    if (!form.title.trim() || !form.imageUrl.trim()) {
      setFormError('Title and image URL are required.');
      return;
    }
    if (form.actionType === 'LINKED_CATEGORY' && !form.categoryId) {
      setFormError('Pick a category for LINKED_CATEGORY banners.');
      return;
    }
    saveBanner.mutate(buildPayload(form));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banners</h1>
          <p className="mt-1 text-sm text-slate-500">Homepage and category promo slots.</p>
        </div>
        <Button onClick={openCreate}>+ New banner</Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load banners'} /></div>}
        {!isLoading && !isError && (!data || data.items.length === 0) && (
          <div className="p-5"><EmptyState title="No banners yet.">Add imagery for a storefront placement.</EmptyState></div>
        )}
        {data && data.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((banner) => (
                  <tr key={banner.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{banner.title}</p>
                      <p className="text-xs text-slate-400">{banner.subtitle ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{titleCase(banner.placement)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {banner.actionType === 'LINKED_CATEGORY'
                        ? banner.category?.name ?? '—'
                        : banner.actionTarget ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{banner.displayOrder}</td>
                    <td className="px-4 py-3">
                      <Toggle
                        checked={banner.isActive}
                        label={`Toggle ${banner.title}`}
                        onChange={() => toggleActive.mutate(banner)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEdit(banner)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete banner "${banner.title}"?`)) removeBanner.mutate(banner.id);
                          }}
                          disabled={removeBanner.isPending}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.title}` : 'New banner'} wide>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title">
            <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Placement">
            <Select
              value={form.placement}
              onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as BannerPlacement }))}
            >
              {PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Image URL">
            <TextInput
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://res.cloudinary.com/…"
            />
          </Field>
          <Field label="Subtitle">
            <TextInput value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </Field>
          {form.imageUrl && (
            <div className="sm:col-span-2">
              <img
                src={form.imageUrl}
                alt="Banner preview"
                className="h-32 w-full rounded-lg border border-slate-200 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <Field label="Action type">
            <Select
              value={form.actionType}
              onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value as BannerActionType }))}
            >
              {ACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </Field>
          {form.actionType === 'LINKED_CATEGORY' ? (
            <Field label="Category">
              <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select a category…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Action target" hint={form.actionType === 'LINKED_PRODUCT' ? 'Product ID or URL' : 'Destination URL'}>
              <TextInput value={form.actionTarget} onChange={(e) => setForm((f) => ({ ...f, actionTarget: e.target.value }))} />
            </Field>
          )}
          <Field label="Display order">
            <TextInput
              type="number"
              min="0"
              step="1"
              value={form.displayOrder}
              onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
            />
          </Field>
          <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            Active
          </div>
        </div>

        {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saveBanner.isPending}>
            {saveBanner.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create banner'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}