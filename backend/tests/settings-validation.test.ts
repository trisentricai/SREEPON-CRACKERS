import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { HttpStatus } from '../src/utils/http';
import { updateSettingsSchema } from '../src/modules/settings/schema';

describe('Settings guards & validation contract (no DB)', () => {
  const app = createApp();

  const ADMIN_ROUTES: Array<[string, string]> = [
    ['get', '/api/v1/admin/settings'],
    ['patch', '/api/v1/admin/settings'],
  ];

  it.each(ADMIN_ROUTES)('%s %s requires a valid Supabase bearer token', async (method, path) => {
    const res = await request(app)[method as 'get' | 'patch'](path);

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(res.body.success).toBe(false);
  });

  it('rejects an empty update body', () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an invalid 3-letter currency', () => {
    const result = updateSettingsSchema.safeParse({ store: { currency: 'RUPEE' } });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed GSTIN', () => {
    const result = updateSettingsSchema.safeParse({ tax: { gstin: 'NOT-A-GSTIN' } });
    expect(result.success).toBe(false);
  });

  it('rejects a negative delivery fee', () => {
    const result = updateSettingsSchema.safeParse({ delivery: { deliveryFee: -5 } });
    expect(result.success).toBe(false);
  });

  it('coerces numeric strings for fees and rates', () => {
    const result = updateSettingsSchema.safeParse({
      delivery: { deliveryFee: '49', freeShippingAbove: '1500' },
      tax: { rate: '18' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full partial update across groups', () => {
    const result = updateSettingsSchema.safeParse({
      store: { name: 'SriPon', supportPhone: '+919876543210' },
      delivery: { enabled: false, deliveryFee: 40 },
      social: { whatsappNumber: '+919876543210' },
    });
    expect(result.success).toBe(true);
  });
});
