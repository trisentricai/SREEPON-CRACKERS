/**
 * Generates `dist/sitemap.xml` after `vite build`.
 *
 * The storefront is a single-page app, so every URL is the same HTML document;
 * a sitemap is still what tells Google which product and policy pages exist.
 * Products and categories are read from the live catalogue at build time, so a
 * deploy refreshes the list automatically. If the API is unreachable the build
 * still succeeds with the static core routes.
 */
import { writeFile } from 'node:fs/promises';

const SITE_URL = 'https://sreepon.in';
const API_BASE_URL =
  process.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
  'https://sreepon-api.trisentricai.workers.dev/api/v1';

const LEGAL_POLICIES = ['privacy', 'terms', 'shipping', 'returns', 'refund', 'cancellation'];

/** @returns {Promise<unknown>} */
async function getJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${path} responded ${response.status}`);
  const body = await response.json();
  return body?.data;
}

function flatten(nodes, out = []) {
  for (const node of nodes ?? []) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function urlEntry(loc, { changefreq = 'monthly', priority = '0.5', lastmod } = {}) {
  const parts = [`    <loc>${escapeXml(`${SITE_URL}${loc}`)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`);
  parts.push(`    <changefreq>${changefreq}</changefreq>`);
  parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

async function main() {
  /** @type {string[]} */
  const entries = [
    urlEntry('/', { changefreq: 'weekly', priority: '1.0' }),
    urlEntry('/products', { changefreq: 'weekly', priority: '0.9' }),
    urlEntry('/policies', { changefreq: 'yearly', priority: '0.3' }),
    ...LEGAL_POLICIES.map((key) =>
      urlEntry(`/policies/${key}`, { changefreq: 'yearly', priority: '0.3' }),
    ),
  ];

  try {
    const [products, tree] = await Promise.all([
      getJson('/products?limit=100&sort=newest'),
      getJson('/categories/tree'),
    ]);

    for (const product of products?.items ?? []) {
      if (!product?.slug) continue;
      entries.push(
        urlEntry(`/products/slug/${product.slug}`, {
          changefreq: 'weekly',
          priority: '0.8',
          lastmod: product.updatedAt,
        }),
      );
    }

    // Categories with no products would be thin pages — leave them out.
    for (const category of flatten(tree)) {
      if (!category?.slug || (category.productCount ?? 0) < 1) continue;
      entries.push(urlEntry(`/products/${category.slug}`, { changefreq: 'weekly', priority: '0.7' }));
    }
  } catch (error) {
    console.warn(`[sitemap] catalogue unavailable, writing core routes only: ${error.message}`);
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');

  await writeFile('dist/sitemap.xml', xml, 'utf8');
  console.log(`[sitemap] wrote ${entries.length} URLs to dist/sitemap.xml`);
}

await main();
