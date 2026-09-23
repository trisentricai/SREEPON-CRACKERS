import type { Prisma } from '@prisma/client';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import { addItem } from '../cart/service';
import type { AddWishlistItemInput } from './schema';

const wishlistProductSelect = {
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

type WishlistProduct = Prisma.ProductGetPayload<{ select: typeof wishlistProductSelect }>;

export interface WishlistItemView {
  id: string;
  addedAt: Date;
  isAvailable: boolean;
  availableStock: number;
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

interface WishlistLine {
  id: string;
  createdAt: Date;
  product: WishlistProduct;
}

function availableStock(product: WishlistProduct): number {
  return Math.max(0, (product.inventory?.quantity ?? 0) - (product.inventory?.reservedQuantity ?? 0));
}

function buildWishlistView(lines: WishlistLine[]): WishlistItemView[] {
  return lines.map((line) => {
    const { product } = line;
    const sellable = product.isActive && product.isApproved;
    const available = sellable ? availableStock(product) : 0;
    return {
      id: line.id,
      addedAt: line.createdAt,
      isAvailable: sellable && available > 0,
      availableStock: available,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        unit: product.unit,
        piecesPerBox: product.piecesPerBox,
        basePrice: product.basePrice.toFixed(2),
        mrpPrice: product.mrpPrice ? product.mrpPrice.toFixed(2) : null,
        imageUrl: product.images[0]?.url ?? null,
      },
    };
  });
}

async function loadSellableProduct(productId: string): Promise<WishlistProduct> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: wishlistProductSelect,
  });
  if (!product || !product.isActive || !product.isApproved) {
    throw ApiError.notFound('Product not found');
  }
  return product;
}

export async function getWishlist(userId: string): Promise<WishlistItemView[]> {
  const lines = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, product: { select: wishlistProductSelect } },
  });
  return buildWishlistView(lines);
}

export async function addToWishlist(userId: string, input: AddWishlistItemInput): Promise<{
  item: WishlistItemView;
  created: boolean;
}> {
  await loadSellableProduct(input.productId);

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId: input.productId } },
    select: { id: true, createdAt: true, product: { select: wishlistProductSelect } },
  });
  if (existing) {
    return { item: buildWishlistView([existing])[0]!, created: false };
  }

  const created = await prisma.wishlistItem.create({
    data: { userId, productId: input.productId },
    select: { id: true, createdAt: true, product: { select: wishlistProductSelect } },
  });
  return { item: buildWishlistView([created])[0]!, created: true };
}

export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  const result = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
  if (result.count === 0) throw ApiError.notFound('Wishlist item not found');
}

/**
 * Move a wishlist entry into the cart and remove it from the wishlist.
 * The cart add is stock-checked; a failed move leaves the wishlist intact.
 */
export async function moveToCart(userId: string, productId: string) {
  const wishlistItem = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true, product: { select: { unit: true } } },
  });
  if (!wishlistItem) throw ApiError.notFound('Wishlist item not found');

  const cart = await addItem(userId, {
    productId,
    quantity: 1,
    unit: wishlistItem.product.unit === 'OTHER' ? 'BOX' : (wishlistItem.product.unit as 'BOX' | 'PACKET' | 'SINGLE'),
  });

  await prisma.wishlistItem.delete({ where: { id: wishlistItem.id } });
  return cart;
}