import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 11 notifications.
 * The Firebase guard runs before any database call, so these must not touch
 * the DB and must pass with or without a Firebase config.
 */
const app = createApp();

describe('notifications: validation & guard contract (no DB / no Firebase required)', () => {
  it('GET /notifications requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/notifications');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /notifications/unread-count requires a bearer token (401)', async () => {
    const res = await request(app).get('/api/v1/notifications/unread-count');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /notifications/read-all requires a bearer token (401)', async () => {
    const res = await request(app).patch('/api/v1/notifications/read-all');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('PATCH /notifications/:id/read requires a bearer token (401)', async () => {
    const res = await request(app).patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /notifications/devices requires a bearer token (401)', async () => {
    const res = await request(app).post('/api/v1/notifications/devices').send({ token: 'fcm-token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /notifications/devices/:token requires a bearer token (401)', async () => {
    const res = await request(app).delete(`/api/v1/notifications/devices/${encodeURIComponent('fcm-token')}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails closed for an invalid token (401 when Firebase configured, else 503)', async () => {
    const token = 'not.a.real.token';
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 503]).toContain(res.status);
  });
});