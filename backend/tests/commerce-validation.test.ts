import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 5 commerce (orders, payments, coupons).
 * Customer endpoints are Firebase-guarded and admin endpoints are
 * Supabase-guarded, so the auth layer runs first and must reject requests
 * without touching the DB or any external provider.
 */
const app = createApp();
const UUID = '00000000-0000-0000-0000-000000000000';

describe('commerce: guard contract (no DB / no Firebase / no Supabase required)', () => {
  it.each([
    ['POST /orders', request(app).post('/api/v1/orders').send({ address: { fullName: 'A', phone: '9999999999', line1: 'x', city: 'c', state: 's', pincode: '600001' } })],
    ['GET /orders', request(app).get('/api/v1/orders')],
    ['GET /orders/:id', request(app).get(`/api/v1/orders/${UUID}`)],
    ['POST /orders/:id/cancel', request(app).post(`/api/v1/orders/${UUID}/cancel`).send({})],
    ['POST /orders/:id/return-request', request(app).post(`/api/v1/orders/${UUID}/return-request`).send({ reason: 'defective' })],
    ['GET /orders/:id/invoice', request(app).get(`/api/v1/orders/${UUID}/invoice`)],
    ['POST /payments', request(app).post('/api/v1/payments').send({ orderId: UUID, provider: 'mock' })],
    ['GET /payments/:id', request(app).get(`/api/v1/payments/${UUID}`)],
    ['POST /coupons/validate', request(app).post('/api/v1/coupons/validate').send({ code: 'TEST', orderSubtotal: 100 })],
  ])('%s requires a bearer token (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['GET /admin/orders', request(app).get('/api/v1/admin/orders')],
    ['GET /admin/orders/:id', request(app).get(`/api/v1/admin/orders/${UUID}`)],
    ['PATCH /admin/orders/:id/status', request(app).patch(`/api/v1/admin/orders/${UUID}/status`).send({ status: 'CONFIRMED' })],
    ['PATCH /admin/orders/:id/payment-status', request(app).patch(`/api/v1/admin/orders/${UUID}/payment-status`).send({ paymentStatus: 'PAID' })],
    ['POST /admin/orders/:id/notes', request(app).post(`/api/v1/admin/orders/${UUID}/notes`).send({ note: 'call customer' })],
    ['GET /admin/orders/:id/invoice', request(app).get(`/api/v1/admin/orders/${UUID}/invoice`)],
    ['GET /admin/coupons', request(app).get('/api/v1/admin/coupons')],
    ['POST /admin/coupons', request(app).post('/api/v1/admin/coupons').send({ code: 'TEST', type: 'PERCENTAGE', value: 10 })],
    ['GET /admin/coupons/:id', request(app).get(`/api/v1/admin/coupons/${UUID}`)],
    ['PATCH /admin/coupons/:id', request(app).patch(`/api/v1/admin/coupons/${UUID}`).send({ value: 15 })],
    ['DELETE /admin/coupons/:id', request(app).delete(`/api/v1/admin/coupons/${UUID}`)],
  ])('%s requires admin authorization (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('keeps payment webhooks public but rejects unsigned payloads (400)', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhooks/mock')
      .set('Content-Type', 'application/json')
      .send({ providerRefId: 'mock_x', success: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});