/**
 * Prepare the Vite output for Cloudflare Pages SPA routing.
 *
 * Cloudflare Pages switches from its default single-page-app behaviour to
 * custom-404 behaviour as soon as a top-level `404.html` exists. In that mode,
 * deep links such as /products, /cart, /orders/... and /policies/... return a
 * real HTTP 404 instead of being rewritten to the SPA shell. Keep the explicit
 * `_redirects` rewrite in the output and remove any generated 404.html so both
 * Pages' automatic SPA fallback and the rewrite work.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const OUTPUT_DIR = 'dist';
const REDIRECT_RULE = '/* /index.html 200\n';
const redirectsPath = `${OUTPUT_DIR}/_redirects`;
const notFoundPath = `${OUTPUT_DIR}/404.html`;

if (
  !existsSync(redirectsPath) ||
  readFileSync(redirectsPath, 'utf8').trim() !== REDIRECT_RULE.trim()
) {
  writeFileSync(redirectsPath, REDIRECT_RULE, 'utf8');
}

rmSync(notFoundPath, { force: true });

console.log('[spa] ensured dist/_redirects (/* /index.html 200) and removed dist/404.html');
