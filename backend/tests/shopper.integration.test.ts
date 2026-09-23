import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/prisma';
import { findOrCreateFromFirebase } from '../src/modules/auth/service';
import * as cartService from '../src/modules/cart/service';
import * as wishlistService from '../src/modules/wishlist/service';

/**
 * Phase 4 shopper-flow tests against a real database.
 * Controllers are thin wrappers over these services (auth-guarded at the HTTP
 * layer, verified in the DB-free suite); the business logic — cart merging,
 * backend-authoritative pricing and stock checks — lives in the services and
 * is exercised directly with seeded users and products.
 */
const hasDB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDB)('cart & wishlist against a real database', () => {
  const stamp = Date.now();
  let userId = '';
  let otherUserId = '';
  let soldProductId = '';
  let passiveProductId = '';
  let zeroStockProductId = '';

  beforeAll(async () => {
    const uid = `it-shopper-${stamp}`;
    const otherUid = `it-shopper-${stamp}-b`;
    const { user } = await findOrCreateFromFirebase({ uid, email: `shopper-${stamp}@example.com`, name: 'Shopper A' });
    const { user: other } = await findOrCreateFromFirebase({ uid: otherUid, email: `shopper-${stamp}-b@example.com` });
    userId = user.id;
    otherUserId = other.id;

    const sold = await prisma.product.create({
      data: {
        name: `Shopper Product ${stamp}`,
        slug: `shopper-product-${stamp}`,
        sku: `SHOP-${stamp}`,
        basePrice: 1250,
        unit: 'BOX',
        isActive: true,
        isApproved: true,
        inventory: { create: { quantity: 10 } },
      },
    });
    soldProductId = sold.id;

    const passive = await prisma.product.create({
      data: {
        name: `Passive Product ${stamp}`,
        slug: `passive-product-${stamp}`,
        sku: `PASS-${stamp}`,
        basePrice: 500,
        unit: 'BOX',
        isActive: false,
        isApproved: true,
        inventory: { create: { quantity: 5 } },
      },
    });
    passiveProductId = passive.id;

    const zeroStock = await prisma.product.create({
      data: {
        name: `Zero Stock ${stamp}`,
        slug: `zero-stock-${stamp}`,
        sku: `ZERO-${stamp}`,
        basePrice: 300,
        unit: 'BOX',
        isActive: true,
        isApproved: true,
        inventory: { create: { quantity: 0 } },
      },
    });
    zeroStockProductId = zeroStock.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { id: { in: [soldProductId, passiveProductId, zeroStockProductId] } },
    });
    await prisma.user.deleteMany({
      where: { OR: [{ id: userId }, { id: otherUserId }] },
    });
  });

  it('adds an item and returns a backend-priced cart', async () => {
    const cart = await cartService.addItem(userId, { productId: soldProductId, quantity: 2, unit: 'BOX' });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(2);
    expect(cart.items[0]!.lineTotal).toBe('2500.00');
    expect(cart.items[0]!.availableStock).toBe(10);
    expect(cart.items[0]!.isOutOfStock).toBe(false);
    expect(cart.subtotal).toBe('2500.00');
    expect(cart.totalQuantity).toBe(2);
    expect(cart.currency).toBe('INR');
    expect(cart.items[0]!.product.basePrice).toMatch(/^\d+\.\d{2}$/);
  });

  it('merges repeated adds of the same product+unit into one line', async () => {
    await cartService.addItem(userId, { productId: soldProductId, quantity: 3, unit: 'BOX' });
    const cart = await cartService.getCart(userId);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.quantity).toBe(5);
    expect(cart.items[0]!.lineTotal).toBe('6250.00');
    expect(cart.subtotal).toBe('6250.00');
  });

  it('keeps a distinct line per unit', async () => {
    await cartService.addItem(userId, { productId: soldProductId, quantity: 1, unit: 'SINGLE' });
    const cart = await cartService.getCart(userId);

    expect(cart.items).toHaveLength(2);
    const box = cart.items.find((i) => i.unit === 'BOX');
    const single = cart.items.find((i) => i.unit === 'SINGLE');
    expect(box?.quantity).toBe(5);
    expect(single?.quantity).toBe(1);
  });

  it('rejects adding beyond the available stock (409)', async () => {
    await expect(
      cartService.addItem(userId, { productId: soldProductId, quantity: 99, unit: 'BOX' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects adding an inactive product (404)', async () => {
    await expect(
      cartService.addItem(userId, { productId: passiveProductId, quantity: 1, unit: 'BOX' }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('flags zero-stock lines as out of stock', async () => {
    await prisma.cartItem.create({
      data: { cartId: (await prisma.cart.findUniqueOrThrow({ where: { userId } })).id, productId: zeroStockProductId, quantity: 2, unit: 'BOX' },
    });
    const cart = await cartService.getCart(userId);

    const line = cart.items.find((i) => i.product.id === zeroStockProductId);
    expect(line?.isOutOfStock).toBe(true);
    expect(line?.availableStock).toBe(0);
    expect(cart.outOfStockCount).toBeGreaterThan(0);
  });

  it('updates a line quantity (stock-checked)', async () => {
    const cart = await cartService.getCart(userId);
    const box = cart.items.find((i) => i.unit === 'BOX')!;

    const updated = await cartService.updateItem(userId, box.id, { quantity: 7 });
    expect(updated.items.find((i) => i.id === box.id)?.quantity).toBe(7);

    await expect(
      cartService.updateItem(userId, box.id, { quantity: 99 }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('does not let a user touch another user cart line (404)', async () => {
    const myCart = await cartService.getCart(userId);
    const itemId = myCart.items[0]!.id;
    await expect(
      cartService.updateItem(otherUserId, itemId, { quantity: 1 }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('removes a line and clears the cart', async () => {
    const cart = await cartService.getCart(userId);
    const itemId = cart.items[0]!.id;

    await cartService.removeItem(userId, itemId);
    await expect(cartService.removeItem(userId, itemId)).rejects.toMatchObject({ status: 404 });

    await cartService.clearCart(userId);
    const cleared = await cartService.getCart(userId);
    expect(cleared.items).toHaveLength(0);
    expect(cleared.subtotal).toBe('0.00');
  });

  it('merges a guest cart, accumulating duplicates and validating stock', async () => {
    await cartService.addItem(userId, { productId: soldProductId, quantity: 2, unit: 'BOX' });

    const merged = await cartService.mergeGuestCart(userId, [
      { productId: soldProductId, quantity: 3, unit: 'BOX' },
      { productId: soldProductId, quantity: 1, unit: 'SINGLE' },
    ]);

    const box = merged.items.find((i) => i.unit === 'BOX');
    const single = merged.items.find((i) => i.unit === 'SINGLE');
    expect(box?.quantity).toBe(5);
    expect(single?.quantity).toBe(1);

    await expect(
      cartService.mergeGuestCart(userId, [{ productId: soldProductId, quantity: 999, unit: 'BOX' }]),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      cartService.mergeGuestCart(userId, [{ productId: passiveProductId, quantity: 1, unit: 'BOX' }]),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('returns a checkout-ready summary', async () => {
    const cart = await cartService.getCart(userId);
    const summary = await cartService.getCartSummary(userId);

    expect(summary.subtotal).toBe(cart.subtotal);
    expect(summary.totalQuantity).toBe(cart.totalQuantity);
    expect(summary.itemCount).toBe(cart.itemCount);
    expect(typeof summary.subtotal).toBe('string');
  });

  it('adds a wishlist item once (idempotent) and lists it', async () => {
    const first = await wishlistService.addToWishlist(userId, { productId: soldProductId });
    const second = await wishlistService.addToWishlist(userId, { productId: soldProductId });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.item.product.id).toBe(soldProductId);
    expect(first.item.isAvailable).toBe(true);

    const list = await wishlistService.getWishlist(userId);
    expect(list).toHaveLength(1);
    expect(list[0]!.product.name).toContain('Shopper Product');
  });

  it('rejects wishlisting an inactive product (404)', async () => {
    await expect(wishlistService.addToWishlist(userId, { productId: passiveProductId })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('moves a wishlist item into the cart and removes it from the wishlist', async () => {
    await wishlistService.addToWishlist(userId, { productId: soldProductId });
    const cartQtyBefore = cartService
      .getCart(userId)
      .then((c) => c.items.find((i) => i.product.id === soldProductId)?.quantity ?? 0);

    await wishlistService.moveToCart(userId, soldProductId);

    const afterCart = await cartService.getCart(userId);
    const afterWishlist = await wishlistService.getWishlist(userId);

    expect(afterWishlist).toHaveLength(0);
    const addedQuantity = afterCart.items.find((i) => i.product.id === soldProductId)?.quantity ?? 0;
    expect(addedQuantity).toBe((await cartQtyBefore) + 1);

    await expect(wishlistService.moveToCart(userId, soldProductId)).rejects.toMatchObject({
      status: 404,
    });
  });
});
