import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 6 content (banners + homepage).
 * All handling is Supabase-guarded for admin and validated-then-guarded
 * for public routes, so these requests must be answered by the auth/validation
 * layer alone without touching the DB or any external provider.
 */
const app = createApp();
const UUID = '00000000-0000-0000-0000-000000000000';

describe('content: guard contract (no DB / no Firebase / no Supabase required)', () => {
  it('rejects an unknown banner placement on the public route (400)', async () => {
    const res = await request(app).get('/api/v1/banners/UNKNOWN_PLACEMENT');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['GET /admin/banners', request(app).get('/api/v1/admin/banners')],
    ['POST /admin/banners', request(app).post('/api/v1/admin/banners').send({ placement: 'HOME_HERO', title: 'Sale', imageUrl: 'https://example.com/sale.png', actionType: 'CUSTOM_URL', actionTarget: 'https://example.com/sale' })],
    ['GET /admin/banners/:id', request(app).get(`/api/v1/admin/banners/${UUID}`)],
    ['PATCH /admin/banners/:id', request(app).patch(`/api/v1/admin/banners/${UUID}`).send({ title: 'Renamed' })],
    ['DELETE /admin/banners/:id', request(app).delete(`/api/v1/admin/banners/${UUID}`)],
    ['POST /admin/banners/:id/duplicate', request(app).post(`/api/v1/admin/banners/${UUID}/duplicate`)],
    ['PATCH /admin/banners/:id/activate', request(app).patch(`/api/v1/admin/banners/${UUID}/activate`).send({ isActive: false })],
    ['PATCH /admin/banners/reorder', request(app).patch('/api/v1/admin/banners/reorder').send({ items: [{ id: UUID, displayOrder: 0 }] })],
  ])('%s requires admin authorization (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['GET /admin/homepage', request(app).get('/api/v1/admin/homepage')],
    ['PUT /admin/homepage', request(app).put('/api/v1/admin/homepage').send({ heroTitle: 'Big Sale' })],
    ['GET /admin/homepage/sections', request(app).get('/api/v1/admin/homepage/sections')],
    ['POST /admin/homepage/sections', request(app).post('/api/v1/admin/homepage/sections').send({ type: 'HERO' })],
    ['PATCH /admin/homepage/sections/:id', request(app).patch(`/api/v1/admin/homepage/sections/${UUID}`).send({ title: 'New' })],
    ['DELETE /admin/homepage/sections/:id', request(app).delete(`/api/v1/admin/homepage/sections/${UUID}`)],
    ['PATCH /admin/homepage/sections/reorder', request(app).patch('/api/v1/admin/homepage/sections/reorder').send({ items: [{ id: UUID, displayOrder: 1 }] })],
  ])('%s requires admin authorization (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});