import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { AuditAction, AuditActorType } from '../../types/enums';
import type {
  DeliverySettingsInput,
  LegalPageKey,
  LegalSettingsInput,
  SettingsAuditContext,
  StoreSettingsInput,
  TaxSettingsInput,
  UpdateSettingsInput,
} from './schema';
import { legalPageKeys } from './schema';

// --- Storage -------------------------------------------------------------

const SETTINGS_CATEGORY = 'settings';

const GROUP_KEYS = {
  store: 'settings.store',
  delivery: 'settings.delivery',
  tax: 'settings.tax',
  social: 'settings.social',
  legal: 'settings.legal',
} as const;

export { GROUP_KEYS };

// --- Views & defaults ----------------------------------------------------

const DEFAULT_STORE = {
  name: 'SriPon',
  tagline: '',
  supportEmail: '',
  supportPhone: '',
  currency: 'INR',
  maintenanceMode: false,
} as const;

const DEFAULT_DELIVERY = {
  enabled: true,
  deliveryFee: '0.00',
  freeShippingAbove: null,
  deliveryNote: '',
} as const;

const DEFAULT_TAX = {
  enabled: false,
  rate: 0,
  gstin: '',
  taxInclusive: false,
} as const;

const DEFAULT_SOCIAL = {
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  whatsappNumber: null,
} as const;

const DEFAULT_LEGAL_PAGE_TITLES: Record<LegalPageKey, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  shipping: 'Shipping Policy',
  returns: 'Returns Policy',
  refund: 'Refund Policy',
  cancellation: 'Cancellation Policy',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function getStoredJson(key: string): Promise<unknown> {
  const setting = await prisma.siteSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

async function upsertGroup(key: string, value: Record<string, unknown>): Promise<void> {
  const json = value as Prisma.InputJsonValue;
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: json, category: SETTINGS_CATEGORY },
    update: { value: json, category: SETTINGS_CATEGORY },
  });
}

/** Merge stored JSON over defaults so responses always carry every known field. */
function mergeGroup<T extends Record<string, unknown>>(defaults: T, stored: unknown): T {
  if (!isPlainObject(stored)) return { ...defaults };
  const merged = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(stored)) {
    merged[key] = value;
  }
  return merged as T;
}

function moneyString(value: number): string {
  return value.toFixed(2);
}

// --- Queries -------------------------------------------------------------

export async function getPublicSettings() {
  const [store, delivery, tax, social] = await Promise.all([
    getStoredJson(GROUP_KEYS.store),
    getStoredJson(GROUP_KEYS.delivery),
    getStoredJson(GROUP_KEYS.tax),
    getStoredJson(GROUP_KEYS.social),
  ]);

  return {
    store: mergeGroup(DEFAULT_STORE, store),
    delivery: mergeGroup(DEFAULT_DELIVERY, delivery),
    tax: mergeGroup(DEFAULT_TAX, tax),
    social: mergeGroup(DEFAULT_SOCIAL, social),
  };
}

export async function getLegalSettings() {
  const stored = await getStoredJson(GROUP_KEYS.legal);
  const policies = isPlainObject(stored) && isPlainObject(stored.policies) ? stored.policies : {};
  const notices =
    isPlainObject(stored) && Array.isArray(stored.notices) ? stored.notices : [];

  return {
    policies: Object.fromEntries(
      legalPageKeys.map((key) => [
        key,
        {
          title: DEFAULT_LEGAL_PAGE_TITLES[key],
          body: '',
          ...(isPlainObject(policies[key]) ? policies[key] : {}),
        },
      ]),
    ) as Record<LegalPageKey, { title: string; body: string }>,
    notices,
  };
}

export async function getAllSettings() {
  const [publicSettings, legal] = await Promise.all([getPublicSettings(), getLegalSettings()]);
  return { ...publicSettings, legal };
}

// --- Mutations -----------------------------------------------------------

function normalizeStore(input: StoreSettingsInput): Record<string, unknown> {
  const store: Record<string, unknown> = {};
  if (input.name !== undefined) store.name = input.name;
  if (input.tagline !== undefined) store.tagline = input.tagline;
  if (input.supportEmail !== undefined) store.supportEmail = input.supportEmail;
  if (input.supportPhone !== undefined) store.supportPhone = input.supportPhone;
  if (input.currency !== undefined) store.currency = input.currency;
  if (input.maintenanceMode !== undefined) store.maintenanceMode = input.maintenanceMode;
  return store;
}

function normalizeDelivery(input: DeliverySettingsInput): Record<string, unknown> {
  const delivery: Record<string, unknown> = {};
  if (input.enabled !== undefined) delivery.enabled = input.enabled;
  if (input.deliveryFee !== undefined) delivery.deliveryFee = moneyString(input.deliveryFee);
  if (input.freeShippingAbove !== undefined) {
    delivery.freeShippingAbove = input.freeShippingAbove === null ? null : moneyString(input.freeShippingAbove);
  }
  if (input.deliveryNote !== undefined) delivery.deliveryNote = input.deliveryNote;
  return delivery;
}

function normalizeTax(input: TaxSettingsInput): Record<string, unknown> {
  const tax: Record<string, unknown> = {};
  if (input.enabled !== undefined) tax.enabled = input.enabled;
  if (input.rate !== undefined) tax.rate = input.rate;
  if (input.gstin !== undefined) tax.gstin = input.gstin;
  if (input.taxInclusive !== undefined) tax.taxInclusive = input.taxInclusive;
  return tax;
}

function normalizeSocial(input: NonNullable<UpdateSettingsInput['social']>): Record<string, unknown> {
  const social: Record<string, unknown> = {};
  if (input.facebookUrl !== undefined) social.facebookUrl = input.facebookUrl;
  if (input.instagramUrl !== undefined) social.instagramUrl = input.instagramUrl;
  if (input.youtubeUrl !== undefined) social.youtubeUrl = input.youtubeUrl;
  if (input.tiktokUrl !== undefined) social.tiktokUrl = input.tiktokUrl;
  if (input.whatsappNumber !== undefined) social.whatsappNumber = input.whatsappNumber;
  return social;
}

async function normalizeLegal(input: LegalSettingsInput): Promise<Record<string, unknown>> {
  const stored = await getStoredJson(GROUP_KEYS.legal);
  const existing = isPlainObject(stored) ? stored : {};

  const policies = isPlainObject(existing.policies) ? { ...existing.policies } : {};
  if (input.policies) {
    for (const [key, page] of Object.entries(input.policies)) {
      policies[key] = page;
    }
  }

  const noticeList = input.notices !== undefined ? input.notices : (Array.isArray(existing.notices) ? existing.notices : []);

  return {
    ...(input.policies !== undefined ? { policies } : {}),
    ...(input.notices !== undefined ? { notices: noticeList } : {}),
  };
}

export async function updateSettings(input: UpdateSettingsInput, ctx: SettingsAuditContext) {
  const changed: string[] = [];

  if (input.store) {
    await upsertGroup(GROUP_KEYS.store, normalizeStore(input.store));
    changed.push('store');
  }
  if (input.delivery) {
    await upsertGroup(GROUP_KEYS.delivery, normalizeDelivery(input.delivery));
    changed.push('delivery');
  }
  if (input.tax) {
    await upsertGroup(GROUP_KEYS.tax, normalizeTax(input.tax));
    changed.push('tax');
  }
  if (input.social) {
    await upsertGroup(GROUP_KEYS.social, normalizeSocial(input.social));
    changed.push('social');
  }
  if (input.legal) {
    await upsertGroup(GROUP_KEYS.legal, await normalizeLegal(input.legal));
    changed.push('legal');
  }

  await prisma.auditLog.create({
    data: {
      actorType: AuditActorType.ADMIN,
      actorId: ctx.actorId ?? undefined,
      action: AuditAction.SETTINGS_CHANGED,
      resource: 'settings',
      requestId: ctx.requestId,
      summary: `Settings updated: ${changed.join(', ')}`,
      metadata: { groups: changed } as Prisma.InputJsonValue | undefined,
    },
  });

  return getAllSettings();
}