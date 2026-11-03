// Cloudflare Pages advanced-mode worker: SPA fallback.
// Static assets (paths containing a file extension) are served from ASSETS;
// everything else returns index.html so client-side routing works on refresh.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }
    return env.ASSETS.fetch(new URL('/index.html', url.origin));
  },
};
