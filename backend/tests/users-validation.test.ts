import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 9 customer profiles.
 * The Firebase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Firebase config.
 */
const app = createApp();

describe('users: validation & guard contract (no DB / no Firebase required)', () => {
  it('GET /users/me requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/users/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /users/me requires a bearer token (401)', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ name: 'Ada' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /users/me/avatar requires a bearer token (401)', async () => {
    const res = await request(app).post('/api/v1/users/me/avatar');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /users/me/orders requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/users/me/orders');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Firebase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(me.status);
  });
});