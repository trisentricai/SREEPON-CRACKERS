import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 10 customer addresses.
 * The Firebase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Firebase config.
 */
const app = createApp();

describe('addresses: validation & guard contract (no DB / no Firebase required)', () => {
  it('GET /addresses requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/addresses');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /addresses requires a bearer token (401)', async () => {
    const res = await request(app).post('/api/v1/addresses').send({ fullName: 'Ada Lovelace' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /addresses/:id requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/addresses/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /addresses/:id requires a bearer token (401)', async () => {
    const res = await request(app).patch('/api/v1/addresses/00000000-0000-0000-0000-000000000000').send({ city: 'Chennai' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /addresses/:id requires a bearer token (401)', async () => {
    const res = await request(app).delete('/api/v1/addresses/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /addresses/:id/default requires a bearer token (401)', async () => {
    const res = await request(app).patch('/api/v1/addresses/00000000-0000-0000-0000-000000000000/default');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Firebase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const res = await request(app)
      .get('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(res.status);
  });
});