// Cloudflare Pages Function: SPA fallback.
//
// Ensures client-side routes (e.g. /products, /cart, /orders/:id) resolve to
// index.html on a hard refresh instead of a 404. Static assets are served by
// Pages before this function runs, so they are unaffected.
export const onRequest: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);

  // Never rewrite asset requests — let Pages serve them directly.
  if (url.pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(url.pathname)) {
    return env.ASSETS.fetch(request);
  }

  // SPA fallback: serve index.html for any other path.
  return env.ASSETS.fetch(new URL('/index.html', url.origin));
};
