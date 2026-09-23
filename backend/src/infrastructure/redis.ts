import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let redis: Redis | null = null;
let lastError: string | undefined;

/**
 * Create (or return) the application Redis client.
 * The client connects lazily; if Redis is unavailable the API must keep
 * working — callers should treat getRedis() === null as "cache disabled".
 * Connectivity problems are reported loudly, never silently ignored.
 */
export function getRedis(): Redis | null {
  if (redis) return redis;

  if (!env.REDIS_URL) {
    if (!lastError) {
      logger.warn('REDIS_URL is not configured — Redis caching/rate-limiting is disabled');
      lastError = 'not-configured';
    }
    return null;
  }

  try {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    redis.on('error', (err) => {
      lastError = err.message;
      logger.error({ err, component: 'redis' }, 'Redis connection error');
    });
    redis.on('ready', () => {
      lastError = undefined;
      logger.info('Redis connected');
    });

    void redis.connect().catch((err: Error) => {
      lastError = err.message;
      logger.error({ err, component: 'redis' }, 'Redis connection failed; continuing without cache');
      void redis?.disconnect();
      redis = null;
    });
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    logger.error({ err, component: 'redis' }, 'Failed to initialize Redis; continuing without cache');
    redis = null;
  }

  return redis;
}

export interface RedisHealth {
  connected: boolean;
  configured: boolean;
  latencyMs?: number;
  error?: string;
}

/** Health probe: PING with a short timeout. Never throws. */
export async function pingRedis(): Promise<RedisHealth> {
  if (!env.REDIS_URL) {
    return { connected: false, configured: false, error: lastError ?? 'REDIS_URL not configured' };
  }
  const client = getRedis();
  if (!client) {
    return { connected: false, configured: true, error: lastError ?? 'client unavailable' };
  }
  const started = Date.now();
  try {
    await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000)),
    ]);
    return { connected: true, configured: true, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Gracefully disconnect Redis on shutdown. */
export async function shutdownRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => undefined);
    redis = null;
  }
}

/** Invalidate a single cache key. Test cacheability outside hot paths. */
export async function invalidateKey(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn({ err, key, component: 'redis' }, 'Failed to invalidate cache key');
  }
}