import { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import type { AddCartItemInput, MergeCartItemInput, UpdateCartItemInput } from './schema';

const cartProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  unit: true,
  piecesPerBox: true,
  basePrice: true,
  mrpPrice: true,
  isActive: true,
  isApproved: true,
  inventory: { select: { quantity: true, reservedQuantity: true } },
  images: { orderBy: { displayOrder: 'asc' as const }, take: 1, select: { url: true } },
} satisfies Prisma.ProductSelect;

type CartProduct = Prisma.ProductGetPayload<{ select: typeof cartProductSelect }>;

export interface CartItemView {
  id: string;
  quantity: number;
  unit: string;
  availableStock: number;
  isOutOfStock: boolean;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    slug: string;
    unit: string;
    piecesPerBox: number | null;
    basePrice: string;
    mrpPrice: string | null;
    imageUrl: string | null;
  };
}

export interface CartView {
  id: string;
  currency: 'INR';
  items: CartItemView[];
  subtotal: string;
  totalQuantity: number;
  itemCount: number;
  outOfStockCount: number;
}

export interface CartSummaryView {
  currency: 'INR';
  subtotal: string;
  totalQuantity: number;
  itemCount: number;
  outOfStockCount: number;
  outOfStockItems: {
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }[];
}

function toPrice(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

async function ensureCart(userId: string): Promise<{ id: string }> {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });
}

async function loadSellableProduct(productId: string): Promise<CartProduct> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: cartProductSelect,
  });
  if (!product || !product.isActive || !product.isApproved) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

function availableStock(product: CartProduct): number {
  return Math.max(0, (product.inventory?.quantity ?? 0) - (product.inventory?.reservedQuantity ?? 0));
}

function assertSufficientStock(product: CartProduct, quantity: number): void {
  const available = availableStock(product);
  if (available <= 0) {
    throw ApiError.conflict(`"${product.name}" is out of stock`);
  }
  if (quantity > available) {
    throw ApiError.conflict(`Only ${available} unit(s) of "${product.name}" are available`);
  }
}

interface CartLine {
  id: string;
  quantity: number;
  unit: string;
  product: CartProduct;
}

function buildCartView(cartId: string, lines: CartLine[]): CartView {
  const items: CartItemView[] = [];
  let subtotal = new Prisma.Decimal(0);
  let totalQuantity = 0;
  let outOfStockCount = 0;

  for (const line of lines) {
    const { product, quantity, unit } = line;
    const sellable = product.isActive && product.isApproved;
    const available = sellable ? availableStock(product) : 0;
    const isOutOfStock = !sellable || available <= 0;
    const lineTotal = new Prisma.Decimal(product.basePrice).mul(quantity);

    subtotal = subtotal.add(lineTotal);
    totalQuantity += quantity;
    if (isOutOfStock) outOfStockCount += 1;

    items.push({
      id: line.id,
      quantity,
      unit,
      availableStock: available,
      isOutOfStock,
      lineTotal: lineTotal.toFixed(2),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        unit: product.unit,
        piecesPerBox: product.piecesPerBox,
        basePrice: toPrice(product.basePrice),
        mrpPrice: product.mrpPrice ? toPrice(product.mrpPrice) : null,
        imageUrl: product.images[0]?.url ?? null,
      },
    });
  }

  return {
    id: cartId,
    currency: 'INR',
    items,
    subtotal: subtotal.toFixed(2),
    totalQuantity,
    itemCount: items.length,
    outOfStockCount,
  };
}

export async function getCart(userId: string): Promise<CartView> {
  const cart = await ensureCart(userId);
  const lines = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      quantity: true,
      unit: true,
      product: { select: cartProductSelect },
    },
  });
  return buildCartView(cart.id, lines);
}

async function addItemCore(userId: string, input: AddCartItemInput): Promise<void> {
  const cart = await ensureCart(userId);
  const product = await loadSellableProduct(input.productId);
  assertSufficientStock(product, input.quantity);

  const compositeId = { cartId: cart.id, productId: input.productId, unit: input.unit };
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId_unit: compositeId } });
  const quantity = existing ? existing.quantity + input.quantity : input.quantity;
  if (existing) assertSufficientStock(product, quantity);

  await prisma.cartItem.upsert({
    where: { cartId_productId_unit: compositeId },
    update: { quantity },
    create: { cartId: cart.id, productId: input.productId, unit: input.unit, quantity: input.quantity },
  });
}

export async function addItem(userId: string, input: AddCartItemInput): Promise<CartView> {
  await addItemCore(userId, input);
  return getCart(userId);
}

export async function updateItem(userId: string, itemId: string, input: UpdateCartItemInput): Promise<CartView> {
  const cart = await ensureCart(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    select: { id: true, productId: true },
  });
  if (!item) throw ApiError.notFound('Cart item not found');

  const product = await loadSellableProduct(item.productId);
  assertSufficientStock(product, input.quantity);

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: input.quantity } });
  return getCart(userId);
}

export async function removeItem(userId: string, itemId: string): Promise<void> {
  const cart = await ensureCart(userId);
  const result = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  if (result.count === 0) throw ApiError.notFound('Cart item not found');
}

export async function clearCart(userId: string): Promise<void> {
  const cart = await ensureCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

/**
 * Merge a guest cart into the authenticated user's cart. Lines that reference
 * the same (product, unit) accumulate.
 */
export async function mergeGuestCart(userId: string, items: MergeCartItemInput[]): Promise<CartView> {
  const aggregated = new Map<string, MergeCartItemInput>();
  for (const item of items) {
    const key = `${item.productId}::${item.unit}`;
    const previous = aggregated.get(key);
    aggregated.set(key, {
      productId: item.productId,
      unit: item.unit,
      quantity: previous ? previous.quantity + item.quantity : item.quantity,
    });
  }

  for (const entry of aggregated.values()) {
    await addItemCore(userId, entry);
  }

  return getCart(userId);
}

export async function getCartSummary(userId: string): Promise<CartSummaryView> {
  const cart = await getCart(userId);
  return {
    currency: cart.currency,
    subtotal: cart.subtotal,
    totalQuantity: cart.totalQuantity,
    itemCount: cart.itemCount,
    outOfStockCount: cart.outOfStockCount,
    outOfStockItems: cart.items
      .filter((item) => item.isOutOfStock)
      .map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        requested: item.quantity,
        available: item.availableStock,
      })),
  };
}