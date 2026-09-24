import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type {
  ApiEnvelope,
  DeliverySettings,
  SettingsView,
  SocialSettings,
  StoreSettings,
  TaxSettings,
} from '@/api/types';
import { Button, Card, ErrorState, Field, Spinner, TextInput, Toggle } from '@/components/admin-ui';

interface FormState {
  store: StoreSettings;
  delivery: DeliverySettings;
  tax: TaxSettings;
  social: SocialSettings;
}

interface StoreForm {
  name: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  maintenanceMode: boolean;
}

interface DeliveryForm {
  enabled: boolean;
  deliveryFee: string;
  freeShippingAbove: string;
  deliveryNote: string;
}

interface TaxForm {
  enabled: boolean;
  rate: string;
  gstin: string;
  taxInclusive: boolean;
}

interface SocialForm {
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  whatsappNumber: string;
}

/** Settings — store, delivery, tax, and social configuration. */
export function SettingsPage() {
  const queryClient = useQueryClient();
  const [store, setStore] = useState<StoreForm | null>(null);
  const [delivery, setDelivery] = useState<DeliveryForm | null>(null);
  const [tax, setTax] = useState<TaxForm | null>(null);
  const [social, setSocial] = useState<SocialForm | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiEnvelope<SettingsView>>('/admin/settings');
      return data.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setStore({
      name: data.store.name,
      tagline: data.store.tagline,
      supportEmail: data.store.supportEmail,
      supportPhone: data.store.supportPhone,
      currency: data.store.currency,
      maintenanceMode: data.store.maintenanceMode,
    });
    setDelivery({
      enabled: data.delivery.enabled,
      deliveryFee: data.delivery.deliveryFee,
      freeShippingAbove: data.delivery.freeShippingAbove ?? '',
      deliveryNote: data.delivery.deliveryNote,
    });
    setTax({
      enabled: data.tax.enabled,
      rate: data.tax.rate.toString(),
      gstin: data.tax.gstin,
      taxInclusive: data.tax.taxInclusive,
    });
    setSocial({
      facebookUrl: data.social.facebookUrl ?? '',
      instagramUrl: data.social.instagramUrl ?? '',
      youtubeUrl: data.social.youtubeUrl ?? '',
      tiktokUrl: data.social.tiktokUrl ?? '',
      whatsappNumber: data.social.whatsappNumber ?? '',
    });
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: async (payload: Partial<FormState>) => {
      const body: Record<string, unknown> = {};
      if (payload.store && store) {
        body.store = {
          name: store.name,
          tagline: store.tagline,
          supportEmail: store.supportEmail,
          supportPhone: store.supportPhone,
          currency: store.currency,
          maintenanceMode: store.maintenanceMode,
        };
      }
      if (payload.delivery && delivery) {
        body.delivery = {
          enabled: delivery.enabled,
          deliveryFee: Number(delivery.deliveryFee) || 0,
          freeShippingAbove: delivery.freeShippingAbove === '' ? null : Number(delivery.freeShippingAbove),
          deliveryNote: delivery.deliveryNote,
        };
      }
      if (payload.tax && tax) {
        body.tax = {
          enabled: tax.enabled,
          rate: Number(tax.rate) || 0,
          gstin: tax.gstin,
          taxInclusive: tax.taxInclusive,
        };
      }
      if (payload.social && social) {
        body.social = {
          facebookUrl: social.facebookUrl || null,
          instagramUrl: social.instagramUrl || null,
          youtubeUrl: social.youtubeUrl || null,
          tiktokUrl: social.tiktokUrl || null,
          whatsappNumber: social.whatsappNumber || null,
        };
      }
      const { data } = await apiClient.patch('/admin/settings', body);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaved('Settings saved.');
      window.setTimeout(() => setSaved(null), 3000);
    },
    onError: (e) => setSaved(e instanceof Error ? e.message : 'Save failed'),
  });

  function submit(group: keyof FormState) {
    return (e: FormEvent) => {
      e.preventDefault();
      setSaved(null);
      saveSettings.mutate({ [group]: true } as Partial<FormState>);
    };
  }

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Failed to load settings'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Store configuration served to the storefront.</p>
      </div>

      {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{saved}</p>}

      {store && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Store</h2>
          <form onSubmit={submit('store')} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <TextInput value={store.name} onChange={(e) => setStore((s) => s && { ...s, name: e.target.value })} />
            </Field>
            <Field label="Currency">
              <TextInput
                value={store.currency}
                maxLength={3}
                onChange={(e) => setStore((s) => s && { ...s, currency: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label="Tagline">
              <TextInput value={store.tagline} onChange={(e) => setStore((s) => s && { ...s, tagline: e.target.value })} />
            </Field>
            <Field label="Support email">
              <TextInput
                value={store.supportEmail}
                onChange={(e) => setStore((s) => s && { ...s, supportEmail: e.target.value })}
              />
            </Field>
            <Field label="Support phone">
              <TextInput value={store.supportPhone} onChange={(e) => setStore((s) => s && { ...s, supportPhone: e.target.value })} />
            </Field>
            <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <Toggle
                checked={store.maintenanceMode}
                onChange={(v) => setStore((s) => s && { ...s, maintenanceMode: v })}
              />
              Maintenance mode
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>Save store</Button>
            </div>
          </form>
        </Card>
      )}

      {delivery && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Delivery</h2>
          <form onSubmit={submit('delivery')} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <Toggle
                checked={delivery.enabled}
                onChange={(v) => setDelivery((s) => s && { ...s, enabled: v })}
              />
              Delivery enabled
            </div>
            <div>
              <Field label="Delivery fee (INR)">
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={delivery.deliveryFee}
                  onChange={(e) => setDelivery((s) => s && { ...s, deliveryFee: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Free shipping above (INR)">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={delivery.freeShippingAbove}
                onChange={(e) => setDelivery((s) => s && { ...s, freeShippingAbove: e.target.value })}
                placeholder="Leave empty to disable"
              />
            </Field>
            <Field label="Delivery note">
              <TextInput
                value={delivery.deliveryNote}
                onChange={(e) => setDelivery((s) => s && { ...s, deliveryNote: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>Save delivery</Button>
            </div>
          </form>
        </Card>
      )}

      {tax && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Tax</h2>
          <form onSubmit={submit('tax')} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <Toggle checked={tax.enabled} onChange={(v) => setTax((s) => s && { ...s, enabled: v })} />
              Tax enabled
            </div>
            <div className="flex items-end gap-2 pb-2 text-sm text-slate-700">
              <Toggle checked={tax.taxInclusive} onChange={(v) => setTax((s) => s && { ...s, taxInclusive: v })} />
              Prices include tax
            </div>
            <Field label="Rate (%)">
              <TextInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={tax.rate}
                onChange={(e) => setTax((s) => s && { ...s, rate: e.target.value })}
              />
            </Field>
            <Field label="GSTIN" hint="15-character GST registration number.">
              <TextInput
                value={tax.gstin}
                maxLength={15}
                onChange={(e) => setTax((s) => s && { ...s, gstin: e.target.value.toUpperCase() })}
              />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>Save tax</Button>
            </div>
          </form>
        </Card>
      )}

      {social && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Social links</h2>
          <form onSubmit={submit('social')} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facebook URL">
              <TextInput value={social.facebookUrl} onChange={(e) => setSocial((s) => s && { ...s, facebookUrl: e.target.value })} />
            </Field>
            <Field label="Instagram URL">
              <TextInput value={social.instagramUrl} onChange={(e) => setSocial((s) => s && { ...s, instagramUrl: e.target.value })} />
            </Field>
            <Field label="YouTube URL">
              <TextInput value={social.youtubeUrl} onChange={(e) => setSocial((s) => s && { ...s, youtubeUrl: e.target.value })} />
            </Field>
            <Field label="TikTok URL">
              <TextInput value={social.tiktokUrl} onChange={(e) => setSocial((s) => s && { ...s, tiktokUrl: e.target.value })} />
            </Field>
            <Field label="WhatsApp number">
              <TextInput value={social.whatsappNumber} onChange={(e) => setSocial((s) => s && { ...s, whatsappNumber: e.target.value })} />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>Save social</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}