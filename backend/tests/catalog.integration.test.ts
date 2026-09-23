import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/prisma';

/**
 * End-to-end catalog tests.
 * Run automatically when DATABASE_URL is configured (CI / local dev);
 * skipped otherwise so unit smoke tests stay DB-free.
 */

const hasDB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDB)('catalog: end-to-end against a real database', () => {
  const app = createApp();

  let categoryId = '';
  let categorySlug = '';
  let productId = '';
  let productSlug = '';
  let hiddenSlug = '';

  // Real admin JWT is out of scope here (Supabase issues it); these tests
  // therefore cover the *public* surface plus admin flows guarded by the
  // auth middleware we already test in the validation suite.

  beforeAll(async () => {
    const stamp = Date.now();

    const category = await prisma.category.create({
      data: {
        name: `Test Category ${stamp}`,
        slug: `test-category-${stamp}`,
        isActive: true,
      },
    });
    categoryId = category.id;
    categorySlug = category.slug;

    const product = await prisma.product.create({
      data: {
        name: `Test Product ${stamp}`,
        slug: `test-product-${stamp}`,
        sku: `TEST-${stamp}`,
        basePrice: 1250,
        unit: 'BOX',
        categoryId,
        isActive: true,
        isApproved: true,
        inventory: { create: { quantity: 10 } },
      },
    });
    productId = product.id;
    productSlug = product.slug;

    const hidden = await prisma.product.create({
      data: {
        name: `Hidden Product ${stamp}`,
        slug: `hidden-product-${stamp}`,
        sku: `HIDDEN-${stamp}`,
        basePrice: 999,
        isActive: true,
        isApproved: false,
      },
    });
    hiddenSlug = hidden.slug;
    await prisma.inventoryItem.create({ data: { productId: hidden.id, quantity: 0 } });
  });

  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { product: { id: productId } } });
    await prisma.inventoryItem.deleteMany({ where: { product: { id: productId } } });
    await prisma.cartItem.deleteMany({ where: { product: { id: productId } } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { name: { startsWith: 'Test Category' } } });
    await prisma.product.deleteMany({ where: { sku: { startsWith: 'HIDDEN-' } } });
    await prisma.$disconnect();
  });

  it('GET /categories/tree returns the created category', async () => {
    const res = await request(app).get('/api/v1/categories/tree');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some((c: { slug: string }) => c.slug === categorySlug)).toBe(true);
  });

  it('GET /categories/:slug returns the category with children', async () => {
    const res = await request(app).get(`/api/v1/categories/${categorySlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(categoryId);
    expect(Array.isArray(res.body.data.children)).toBe(true);
  });

  it('GET /products lists only approved, active products', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    const slugs: string[] = res.body.data.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain(productSlug);
    expect(slugs).not.toContain(hiddenSlug);
  });

  it('GET /products/search finds by query term', async () => {
    const res = await request(app).get(`/api/v1/products/search?q=${encodeURIComponent(productSlug)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /products/slug/:slug returns the product', async () => {
    const res = await request(app).get(`/api/v1/products/slug/${productSlug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(productId);
    expect(typeof res.body.data.basePrice).toBe('string');
  });

  it('GET /products/:slug of an unapproved product 404s', async () => {
    const res = await request(app).get(`/api/v1/products/slug/${hiddenSlug}`);
    expect(res.status).toBe(404);
  });

  it('GET /products?category= filters to the subtree', async () => {
    const res = await request(app).get(`/api/v1/products?category=${categorySlug}`);
    expect(res.status).toBe(200);
    const slugs: string[] = res.body.data.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain(productSlug);
  });

  it('money is serialized as a fixed string (no float drift)', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    const product = res.body.data.items.find((p: { id: string }) => p.id === productId);
    expect(typeof product?.basePrice).toBe('string');
    expect(String(product?.basePrice)).toMatch(/^\d+\.\d{2}$/);
  });
});