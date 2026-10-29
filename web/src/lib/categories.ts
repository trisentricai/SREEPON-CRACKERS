import type { CategoryTreeNode } from '@/api/types';

/**
 * A category is worth showing when it, or any descendant, has a product.
 * `/categories/tree` reports `productCount` per node, and products hang off
 * leaves, so parents read 0 even when their children are stocked.
 */
export function hasProducts(category: CategoryTreeNode): boolean {
  return (category.productCount ?? 0) > 0 || (category.children ?? []).some(hasProducts);
}

/**
 * Drops categories with nothing to sell, recursively. Keeps shoppers out of
 * "no products found" dead ends and keeps thin URLs out of the sitemap. A
 * category reappears automatically once its first product is published.
 */
export function visibleCategoryTree(categories: CategoryTreeNode[]): CategoryTreeNode[] {
  return categories
    .filter(hasProducts)
    .map((category) => ({
      ...category,
      children: visibleCategoryTree(category.children ?? []),
    }));
}

/**
 * Slugs of every category with something to sell. Homepage section categories
 * arrive without a `productCount`, so the full tree is the only source of
 * truth for which of them are worth linking to.
 */
export function visibleCategorySlugs(categories: CategoryTreeNode[]): Set<string> {
  const slugs = new Set<string>();
  const walk = (nodes: CategoryTreeNode[]) => {
    for (const node of nodes) {
      if (!hasProducts(node)) continue;
      slugs.add(node.slug);
      walk(node.children ?? []);
    }
  };
  walk(categories);
  return slugs;
}
