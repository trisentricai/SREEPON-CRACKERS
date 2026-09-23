import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

/**
 * DB-free contract checks for Phase 4 shopper flows (cart + wishlist).
 * Every cart/wishlist endpoint is Firebase-guarded, so the auth layer runs
 * first and must be verified without touching the DB or Firebase.
 */
const app = createApp();

describe('shopper flows: guard contract (no DB / no Firebase required)', () => {
  it.each([
    ['GET /cart', request(app).get('/api/v1/cart')],
    ['POST /cart/items', request(app).post('/api/v1/cart/items').send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 })],
    ['PATCH /cart/items/:id', request(app).patch('/api/v1/cart/items/00000000-0000-0000-0000-000000000000').send({ quantity: 2 })],
    ['DELETE /cart/items/:id', request(app).delete('/api/v1/cart/items/00000000-0000-0000-0000-000000000000')],
    ['DELETE /cart', request(app).delete('/api/v1/cart')],
    ['POST /cart/merge', request(app).post('/api/v1/cart/merge').send({ items: [] })],
    ['GET /cart/summary', request(app).get('/api/v1/cart/summary')],
  ])('%s requires a bearer token (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['GET /wishlist', request(app).get('/api/v1/wishlist')],
    ['POST /wishlist/items', request(app).post('/api/v1/wishlist/items').send({ productId: '00000000-0000-0000-0000-000000000000' })],
    ['DELETE /wishlist/items/:productId', request(app).delete('/api/v1/wishlist/items/00000000-0000-0000-0000-000000000000')],
    ['POST /wishlist/items/:productId/move-to-cart', request(app).post('/api/v1/wishlist/items/00000000-0000-0000-0000-000000000000/move-to-cart')],
  ])('%s requires a bearer token (401)', async (_label, pendingReq) => {
    const res = await pendingReq;

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});