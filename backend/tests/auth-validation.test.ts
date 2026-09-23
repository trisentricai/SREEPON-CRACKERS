import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 3 customer auth.
 * Validation and guard layers run before any database/Firebase call, so these
 * must not touch the DB and must pass with or without a Firebase config.
 */
const app = createApp();

describe('auth: validation & guard contract (no DB / no Firebase required)', () => {
  it('POST /auth/login with an empty body fails validation (422)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /auth/login rejects a blank idToken (422)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ idToken: '   ' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/register requires an idToken (422)', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/password/reset rejects an invalid email (422)', async () => {
    const res = await request(app).post('/api/v1/auth/password/reset').send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /auth/logout requires a bearer token (401)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /auth/me requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Firebase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const login = await request(app).post('/api/v1/auth/login').send({ idToken: token });
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(login.status);
    expect([401, 503]).toContain(me.status);
  });
});