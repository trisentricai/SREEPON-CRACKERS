import type { BrandBanner } from '@/api/types';

/** Minimal category shape accepted by the quick-commerce rails. */
export type CategoryTile = {
  id: string;
  slug: string;
  name: string;
  bannerImageUrl?: string | null;
  children?: CategoryTile[];
};

/** Flatten a category tree into a horizontal, scrollable tile rail. */
export function flattenCategories(nodes: CategoryTile[]): CategoryTile[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children ?? [])]);
}

export function isExternalUrl(target: string): boolean {
  return /^(?:https?:)?\/\//i.test(target);
}

/** Resolve a banner's action into an internal route or external URL. */
export function bannerHref(banner: BrandBanner): string | null {
  switch (banner.actionType) {
    case 'LINKED_CATEGORY':
      return banner.category?.slug ? `/products/${banner.category.slug}` : '/products';
    case 'LINKED_PRODUCT':
      if (banner.product) {
        return banner.product.categorySlug
          ? `/products/${banner.product.categorySlug}/${banner.product.slug}`
          : `/products/slug/${banner.product.slug}`;
      }
      return banner.actionTarget?.startsWith('/') ? banner.actionTarget : null;
    case 'CUSTOM_URL':
      return banner.actionTarget &&
        (banner.actionTarget.startsWith('/') || isExternalUrl(banner.actionTarget))
        ? banner.actionTarget
        : null;
    default:
      return null;
  }
}
