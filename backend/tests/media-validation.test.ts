import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 15 media (avatar upload + signed uploads).
 * The auth guards run before any database/Cloudinary call, so these must not
 * touch the DB or Cloudinary and must pass with or without config.
 */
const app = createApp();

describe('media: validation & guard contract (no DB / no Cloudinary required)', () => {
  it('POST /users/me/avatar requires a bearer token (401)', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/avatar')
      .send({ image: 'aGVsbG8=', mimeType: 'image/png' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /admin/media/sign requires a bearer token (401)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/sign')
      .send({ folder: 'sripon/products', resourceType: 'image' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed on an invalid Firebase token for avatar (401 when configured, else 503)', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({ image: 'aGVsbG8=', mimeType: 'image/png' });

    expect([401, 503]).toContain(res.status);
  });

  it('fails closed on an invalid Supabase token for /admin/media/sign (401 when configured, else 503)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/media/sign')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({ folder: 'sripon/products' });

    expect([401, 503]).toContain(res.status);
  });
});