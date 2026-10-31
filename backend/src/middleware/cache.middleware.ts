import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { getRedis } from '../infrastructure/redis';
import { logger } from '../utils/logger';

interface RouteCacheConfig {
  ttlSeconds: number;
  staleWhileRevalidateSeconds?: number;
  cacheInRedis: boolean;
}

/** Read-only routes safe to cache. Covers catalog, settings, and public content. */
const CACHE_CONFIG: Record<string, RouteCacheConfig> = {
  '/api/v1/products': { ttlSeconds: 60, staleWhileRevalidateSeconds: 300, cacheInRedis: true },
  '/api/v1/products/search': { ttlSeconds: 60, staleWhileRevalidateSeconds: 300, cacheInRedis: true },
  '/api/v1/products/slug/': { ttlSeconds: 120, staleWhileRevalidateSeconds: 600, cacheInRedis: true },
  '/api/v1/categories': { ttlSeconds: 120, staleWhileRevalidateSeconds: 600, cacheInRedis: true },
  '/api/v1/categories/tree': { ttlSeconds: 300, staleWhileRevalidateSeconds: 900, cacheInRedis: true },
  '/api/v1/categories/': { ttlSeconds: 120, staleWhileRevalidateSeconds: 600, cacheInRedis: true },
  '/api/v1/banners': { ttlSeconds: 120, staleWhileRevalidateSeconds: 600, cacheInRedis: true },
  '/api/v1/homepage': { ttlSeconds: 120, staleWhileRevalidateSeconds: 600, cacheInRedis: true },
  '/api/v1/settings/public': { ttlSeconds: 300, staleWhileRevalidateSeconds: 900, cacheInRedis: true },
  '/api/v1/settings/legal': { ttlSeconds: 300, staleWhileRevalidateSeconds: 900, cacheInRedis: true },
};
// NOTE: /api/v1/payments/providers requires Firebase auth and is intentionally
// excluded from app-level caching to avoid bypassing route-level auth middleware.

function findCacheConfig(path: string): RouteCacheConfig | undefined {
  for (const [pattern, config] of Object.entries(CACHE_CONFIG)) {
    if (path === pattern || path.startsWith(pattern)) {
      return config;
    }
  }
  return undefined;
}

function buildCacheControl(config: RouteCacheConfig): string {
  const parts = [`public, max-age=${config.ttlSeconds}`];
  if (config.staleWhileRevalidateSeconds) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidateSeconds}`);
  }
  return parts.join(', ');
}

export const httpCache = (): RequestHandler =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const config = findCacheConfig(req.path);
    if (!config) {
      next();
      return;
    }

    res.setHeader('Cache-Control', buildCacheControl(config));
    res.setHeader('Vary', 'Accept-Encoding');

    if (config.cacheInRedis) {
      const client = getRedis();
      if (client) {
        try {
          const cacheKey = `http:cache:${encodeURIComponent(req.originalUrl)}`;
          const cached = await client.get(cacheKey);
          if (cached) {
            res.setHeader('X-Cache', 'HIT');
            res.status(200).send(cached);
            return;
          }
        } catch (err) {
          logger.warn({ err, path: req.originalUrl }, 'cache read failed; proceeding without cache');
        }
      }
    }

    const originalSend = res.send.bind(res);
    let responseBody: string | undefined;

    res.send = ((body?: unknown) => {
      if (config.cacheInRedis && res.statusCode === 200) {
        responseBody = typeof body === 'string' ? body : typeof body === 'object' ? JSON.stringify(body) : String(body ?? '');
      }
      return originalSend(body);
    }) as Response['send'];

    res.on('finish', () => {
      if (!responseBody || !config.cacheInRedis) return;
      const client = getRedis();
      if (!client) return;
      try {
        const cacheKey = `http:cache:${encodeURIComponent(req.originalUrl)}`;
        void client.set(cacheKey, responseBody, 'EX', config.ttlSeconds).catch(() => undefined);
      } catch (err) {
        logger.warn({ err, path: req.originalUrl }, 'cache write failed');
      }
    });

    next();
  });

export async function invalidateHttpCache(...urlPrefixes: string[]): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    for (const prefix of urlPrefixes) {
      await client.del(`http:cache:${encodeURIComponent(prefix)}`).catch(() => undefined);
      // Also try with trailing ? for query variants
      await client.del(`http:cache:${encodeURIComponent(prefix + '?')}`).catch(() => undefined);
    }
  } catch (err) {
    logger.warn({ err, urlPrefixes }, 'http cache invalidation failed');
  }
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}
