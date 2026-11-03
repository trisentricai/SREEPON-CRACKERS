// Cloudflare Pages Function: SPA fallback (repo-root placement for cases where
// the Pages project root is the repository root rather than web/).
export const onRequest: PagesFunction = async ({ request, env }) => {
  const url = new URL(request.url);

  if (url.pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(url.pathname)) {
    return env.ASSETS.fetch(request);
  }

  return env.ASSETS.fetch(new URL('/index.html', url.origin));
};
