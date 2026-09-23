import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for the Phase 2 catalog.
 * These must not touch the database: validation and auth layers run first.
 */
const app = createApp();

describe('catalog: validation contract (no DB required)', () => {
  it('rejects out-of-range pagination with a 422 field envelope', async () => {
    const res = await request(app).get('/api/v1/products?limit=0');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('public search requires a query term', async () => {
    const res = await request(app).get('/api/v1/products/search');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('admin create product requires admin auth', async () => {
    const res = await request(app).post('/api/v1/admin/products').send({
      name: 'Test Product',
      sku: 'TEST-1',
      basePrice: 100,
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('admin category reorder requires admin auth', async () => {
    const res = await request(app).patch('/api/v1/admin/categories/reorder').send([
      { id: '00000000-0000-0000-0000-000000000000', displayOrder: 1 },
    ]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});