import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, Category, CreateCategoryInput } from '@/api/types';
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
import { slugify } from '@/lib/format';

interface CategoryFormState {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  isActive: boolean;
  isFeatured: boolean;
}

const EMPTY_FORM: CategoryFormState = {
  name: '',
  slug: '',
  parentId: '',
  description: '',
  isActive: true,
  isFeatured: false,
};

function toForm(category: Category): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? '',
    description: category.description ?? '',
    isActive: category.isActive,
    isFeatured: category.isFeatured,
  };
}

function buildPayload(form: CategoryFormState): CreateCategoryInput {
  return {
    name: form.name,
    slug: form.slug || undefined,
    parentId: form.parentId || null,
    description: form.description || undefined,
    isActive: form.isActive,
    isFeatured: form.isFeatured,
  };
}

/** Categories — nested catalog management. */
export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<Category[]>>('/admin/categories', {
        params: { includeInactive: true },
      });
      return data.data;
    },
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });

  const saveCategory = useMutation({
    mutationFn: async (payload: CreateCategoryInput) => {
      if (editing) {
        const { data } = await apiClient.patch(`/admin/categories/${editing.id}`, payload);
        return data;
      }
      const { data } = await apiClient.post('/admin/categories', payload);
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

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/categories/${id}`);
    },
    onSuccess: () => invalidate(),
  });

  const toggleActive = useMutation({
    mutationFn: async (category: Category) => {
      const { data } = await apiClient.patch(`/admin/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      return data;
    },
    onSuccess: () => invalidate(),
  });

  const categories = data ?? [];
  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  function openCreate(parentId = '') {
    setEditing(null);
    setForm({ ...EMPTY_FORM, parentId });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setForm(toForm(category));
    setFormError(null);
    setModalOpen(true);
  }

  function submit() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    saveCategory.mutate(buildPayload(form));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">Nested category structure for the storefront.</p>
        </div>
        <Button onClick={() => openCreate()}>+ New category</Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load categories'} /></div>}
        {!isLoading && !isError && categories.length === 0 && (
          <div className="p-5">
            <EmptyState title="No categories yet.">Add your first category to organise products.</EmptyState>
          </div>
        )}
        {categories.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => {
                const parent = categories.find((c) => c.id === category.parentId);
                return (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{category.name}</p>
                      <p className="text-xs text-slate-400">{category.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{parent?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{category.productCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={category.isActive}
                          label={`Toggle ${category.name}`}
                          onChange={() => toggleActive.mutate(category)}
                        />
                        {category.isFeatured && <Badge tone="orange">Featured</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => openCreate(category.id)}>
                          + Child
                        </Button>
                        <Button variant="ghost" onClick={() => openEdit(category)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete category "${category.name}"?`)) removeCategory.mutate(category.id);
                          }}
                          disabled={removeCategory.isPending}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : 'New category'}>
        <div className="space-y-4">
          <Field label="Name">
            <TextInput
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value, slug: editing ? f.slug : slugify(e.target.value) }))
              }
            />
          </Field>
          <Field label="Slug">
            <TextInput value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </Field>
          <Field label="Parent category">
            <Select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
              <option value="">No parent (top level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <TextInput
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
              Active
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Toggle checked={form.isFeatured} onChange={(v) => setForm((f) => ({ ...f, isFeatured: v }))} />
              Featured
            </div>
          </div>
        </div>

        {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saveCategory.isPending}>
            {saveCategory.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}