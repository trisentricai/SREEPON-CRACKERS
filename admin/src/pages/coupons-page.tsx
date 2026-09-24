import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, Coupon, CouponListResponse, CreateCouponInput, DiscountType } from '@/api/types';
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
import { formatDate, formatMoney } from '@/lib/format';

const LIMIT = 20;

interface CouponFormState {
  code: string;
  type: DiscountType;
  value: string;
  maxDiscount: string;
  minOrderValue: string;
  usageLimit: string;
  perUserLimit: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
}

const EMPTY_FORM: CouponFormState = {
  code: '',
  type: 'PERCENTAGE',
  value: '',
  maxDiscount: '',
  minOrderValue: '',
  usageLimit: '',
  perUserLimit: '1',
  startAt: '',
  endAt: '',
  isActive: true,
};

function toForm(coupon: Coupon): CouponFormState {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    maxDiscount: coupon.maxDiscount ?? '',
    minOrderValue: coupon.minOrderValue ?? '',
    usageLimit: coupon.usageLimit?.toString() ?? '',
    perUserLimit: coupon.perUserLimit.toString(),
    startAt: coupon.startAt ? coupon.startAt.slice(0, 10) : '',
    endAt: coupon.endAt ? coupon.endAt.slice(0, 10) : '',
    isActive: coupon.isActive,
  };
}

function buildPayload(form: CouponFormState): CreateCouponInput {
  return {
    code: form.code.toUpperCase(),
    type: form.type,
    value: Number(form.value),
    ...(form.maxDiscount ? { maxDiscount: Number(form.maxDiscount) } : {}),
    ...(form.minOrderValue ? { minOrderValue: Number(form.minOrderValue) } : {}),
    ...(form.usageLimit ? { usageLimit: Number(form.usageLimit) } : {}),
    perUserLimit: Number(form.perUserLimit) || 1,
    ...(form.startAt ? { startAt: new Date(`${form.startAt}T00:00:00`).toISOString() } : {}),
    ...(form.endAt ? { endAt: new Date(`${form.endAt}T00:00:00`).toISOString() } : {}),
    isActive: form.isActive,
  };
}

/** Coupons — discount code management tied to the redemption ledger. */
export function CouponsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-coupons', page, q],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<CouponListResponse>>('/admin/coupons', {
        params: { page, limit: LIMIT, q: q || undefined },
      });
      return data.data;
    },
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });

  const saveCoupon = useMutation({
    mutationFn: async (payload: CreateCouponInput) => {
      if (editing) {
        const { data } = await apiClient.patch(`/admin/coupons/${editing.id}`, payload);
        return data;
      }
      const { data } = await apiClient.post('/admin/coupons', payload);
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

  const removeCoupon = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/coupons/${id}`);
    },
    onSuccess: () => invalidate(),
  });

  const toggleActive = useMutation({
    mutationFn: async (coupon: Coupon) => {
      const { data } = await apiClient.patch(`/admin/coupons/${coupon.id}`, { isActive: !coupon.isActive });
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

  function openEdit(coupon: Coupon) {
    setEditing(coupon);
    setForm(toForm(coupon));
    setFormError(null);
    setModalOpen(true);
  }

  function submit() {
    setFormError(null);
    if (!form.code.trim() || !form.value) {
      setFormError('Code and value are required.');
      return;
    }
    saveCoupon.mutate(buildPayload(form));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">Discount codes validated at checkout.</p>
        </div>
        <Button onClick={openCreate}>+ New coupon</Button>
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
          placeholder="Search by code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" type="submit">
          Search
        </Button>
      </form>

      <Card className="overflow-hidden p-0">
        {isLoading && <Spinner />}
        {isError && <div className="p-5"><ErrorState message={error instanceof Error ? error.message : 'Failed to load coupons'} /></div>}
        {!isLoading && !isError && (!data || data.items.length === 0) && (
          <div className="p-5"><EmptyState title="No coupons yet.">Create one to offer a discount at checkout.</EmptyState></div>
        )}
        {data && data.items.length > 0 && (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Min order</th>
                  <th className="px-4 py-3">Used</th>
                  <th className="px-4 py-3">Valid</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{coupon.code}</td>
                    <td className="px-4 py-3 text-slate-800">
                      {coupon.type === 'PERCENTAGE' ? `${Number(coupon.value)}%` : formatMoney(coupon.value)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatMoney(coupon.minOrderValue)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {coupon.usedCount}
                      {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {coupon.endAt ? `until ${formatDate(coupon.endAt)}` : 'no expiry'}
                    </td>
                    <td className="px-4 py-3">
                      <Toggle
                        checked={coupon.isActive}
                        label={`Toggle ${coupon.code}`}
                        onChange={() => toggleActive.mutate(coupon)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => openEdit(coupon)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Delete coupon "${coupon.code}"?`)) removeCoupon.mutate(coupon.id);
                          }}
                          disabled={removeCoupon.isPending}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.code}` : 'New coupon'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Code">
            <TextInput
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="DIWALI25"
            />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DiscountType }))}>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </Select>
          </Field>
          <Field label="Value">
            <TextInput
              type="number"
              min="0.01"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder={form.type === 'PERCENTAGE' ? '10 (%)' : '200 (INR)'}
            />
          </Field>
          <Field label="Max discount (INR)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.maxDiscount}
              onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
            />
          </Field>
          <Field label="Min order value (INR)">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={form.minOrderValue}
              onChange={(e) => setForm((f) => ({ ...f, minOrderValue: e.target.value }))}
            />
          </Field>
          <Field label="Usage limit">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={form.usageLimit}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
            />
          </Field>
          <Field label="Per-user limit">
            <TextInput
              type="number"
              min="1"
              step="1"
              value={form.perUserLimit}
              onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
            />
          </Field>
          <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <Toggle checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            Active
          </div>
          <Field label="Start date">
            <TextInput type="date" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
          </Field>
          <Field label="End date">
            <TextInput type="date" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
          </Field>
        </div>

        {formError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saveCoupon.isPending}>
            {saveCoupon.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}