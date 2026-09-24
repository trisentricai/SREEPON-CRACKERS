import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 13 analytics.
 * The Supabase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Supabase config.
 */
const app = createApp();

describe('analytics: validation & guard contract (no DB / no Supabase required)', () => {
  it('GET /admin/analytics/dashboard requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/dashboard');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/analytics/revenue requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/revenue');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/analytics/orders requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/orders');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/analytics/top-products requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/top-products');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admin/analytics/categories requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/analytics/categories');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Supabase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const res = await request(app)
      .get('/api/v1/admin/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(res.status);
  });
});