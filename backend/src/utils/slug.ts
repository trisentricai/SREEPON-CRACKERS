/**
 * URL-safe, lowercase, hyphenated slugs for categories and products.
 * Non-ASCII letters (e.g. Tamil) are preserved rather than dropped so the slug
 * stays meaningful; separators collapse to single hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+|['’]/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}