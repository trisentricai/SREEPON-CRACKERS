import { useEffect } from 'react';
import { SITE } from '@/config/env';

/**
 * Document head management for a single-page app.
 *
 * There is no SSR here, so crawlers that execute JavaScript (Google, Bing) see
 * exactly what we write. These helpers keep the title, description, canonical
 * and social cards in sync with the route without pulling in a dependency.
 */

export const DEFAULT_TITLE = `${SITE.name} — Premium crackers & gift boxes`;
export const DEFAULT_DESCRIPTION =
  'Order licensed, CE/ISI-compliant crackers and gift boxes from green crackers and candles. GST invoice on every order, dispatch in 24–48h across India, cash on delivery available.';

const DEFAULT_IMAGE = `${SITE.baseUrl}/logo.webp`;

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string): void {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

export interface PageMeta {
  /** Page title without the store suffix — it is appended automatically. */
  title?: string;
  description?: string;
  /** Route path used for the canonical URL, e.g. `/products/gift-boxes`. */
  path?: string;
  image?: string | null;
  type?: 'website' | 'product' | 'article';
  /** Hide from search engines (cart, checkout, account pages). */
  noindex?: boolean;
}

/** Applies route-level `<head>` tags. */
export function usePageMeta({ title, description, path, image, type = 'website', noindex }: PageMeta): void {
  const resolvedTitle = title ? `${title} · ${SITE.name}` : DEFAULT_TITLE;
  const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION;
  const resolvedImage = image || DEFAULT_IMAGE;
  const canonical = `${SITE.baseUrl}${path ?? window.location.pathname}`;

  useEffect(() => {
    document.title = resolvedTitle;
    upsertMeta('name', 'description', resolvedDescription);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:site_name', SITE.name);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', resolvedTitle);
    upsertMeta('property', 'og:description', resolvedDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', resolvedImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', resolvedTitle);
    upsertMeta('name', 'twitter:description', resolvedDescription);
    upsertMeta('name', 'twitter:image', resolvedImage);
  }, [resolvedTitle, resolvedDescription, resolvedImage, canonical, type, noindex]);
}

/**
 * Injects a JSON-LD block for structured data (Organization, Product, …) and
 * removes it when the route unmounts so pages don't accumulate stale schemas.
 */
export function useJsonLd(id: string, data: Record<string, unknown> | null): void {
  const serialised = data ? JSON.stringify(data) : null;

  useEffect(() => {
    if (!serialised) return;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = serialised;

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [id, serialised]);
}
