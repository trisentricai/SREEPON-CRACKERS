import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 12 inventory.
 * The Supabase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Supabase config.
 */
const app = createApp();

describe('inventory: validation & guard contract (no DB / no Supabase required)', () => {
  it('GET /admin/inventory requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/inventory');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/inventory/low-stock requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/inventory/low-stock');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /admin/inventory/:productId/adjust requires a bearer token (401)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/inventory/00000000-0000-0000-0000-000000000000/adjust')
      .send({ delta: 10, reason: 'STOCK_IN' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/inventory/:productId/transactions requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/inventory/00000000-0000-0000-0000-000000000000/transactions');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Supabase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const res = await request(app)
      .get('/api/v1/admin/inventory')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(res.status);
  });
});