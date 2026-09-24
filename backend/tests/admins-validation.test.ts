import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 14 admins.
 * The Supabase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Supabase config.
 */
const app = createApp();
const UUID = '00000000-0000-0000-0000-000000000000';

describe('admins: validation & guard contract (no DB / no Supabase required)', () => {
  it('GET /admins requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/admins');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /admins requires a bearer token (401)', async () => {
    const res = await request(app)
      .post('/api/v1/admins')
      .send({ email: 'admin@example.com', password: 'password123', role: 'ADMIN' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /admins/:id requires a bearer token (401)', async () => {
    const res = await request(app).get(`/api/v1/admins/${UUID}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /admins/:id requires a bearer token (401)', async () => {
    const res = await request(app).patch(`/api/v1/admins/${UUID}`).send({ name: 'New Name' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /admins/:id requires a bearer token (401)', async () => {
    const res = await request(app).delete(`/api/v1/admins/${UUID}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /admins/:id/role requires a bearer token (401)', async () => {
    const res = await request(app).patch(`/api/v1/admins/${UUID}/role`).send({ role: 'ANALYST' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Supabase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const res = await request(app).get('/api/v1/admins').set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(res.status);
  });
});