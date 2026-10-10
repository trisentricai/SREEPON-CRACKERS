import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { env, isWorkers } from '../config/env';
import { logger } from '../utils/logger';

/**
 * Narrow, storage-agnostic Redis surface used across the app.
 *
 * Backed by ioredis on Node (Render/local) and by Upstash's HTTP REST client on
 * Cloudflare Workers, where raw TCP sockets are unavailable. Consumers only
 * touch the members below, so the two backends are interchangeable.
 */
export interface AppRedisClient {
  /** ioredis-style connection state; Upstash is synchronous HTTP ("ready"). */
  status: string;
  ping(): Promise<string>;
  del(...keys: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  /** Send an arbitrary command (used by the Redis-backed rate-limit store). */
  call(command: string, ...args: (string | number)[]): Promise<unknown>;
  quit(): Promise<unknown>;
}

let redis: AppRedisClient | null = null;
let lastError: string | undefined;

/** True when some Redis backend is configured for the current platform. */
export function isRedisConfigured(): boolean {
  if (isWorkers) return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
  return Boolean(env.REDIS_URL);
}

/**
 * Upstash REST client for Cloudflare Workers.
 *
 * The SDK's typed methods cover the common commands; `call` (needed by
 * rate-limit-redis to run its Lua scripts) is issued directly over HTTP because
 * the SDK only auto-generates typed command methods and has no raw-command API.
 */
function createUpstashClient(url: string, token: string): AppRedisClient {
  const client = new UpstashRedis({ url, token });

  const command = async (args: (string | number)[]): Promise<unknown> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args.map((a) => String(a))),
    });
    const payload = (await res.json()) as { result?: unknown; error?: string };
    if (payload.error) throw new Error(payload.error);
    if (!res.ok) throw new Error(`Upstash request failed with status ${res.status}`);
    return payload.result;
  };

  return {
    status: 'ready',
    ping: () => client.ping(),
    del: (...keys) => client.del(...keys),
    rpush: (key, ...values) => client.rpush(key, ...values),
    get: (key) => client.get<string>(key),
    set: (key, value, ...args) => command(['SET', key, value, ...args]),
    incr: (key) => client.incr(key),
    expire: (key, seconds) => client.expire(key, seconds),
    call: (cmd, ...args) => command([cmd, ...args]),
    // Upstash is stateless HTTP — there is no connection to tear down.
    quit: async () => 'OK',
  };
}

/**
 * Create (or return) the application Redis client.
 * The client connects lazily; if Redis is unavailable the API must keep
 * working — callers should treat getRedis() === null as "cache disabled".
 * Connectivity problems are reported loudly, never silently ignored.
 */
export function getRedis(): AppRedisClient | null {
  if (redis) return redis;

  // Cloudflare Workers cannot open raw TCP connections to Redis (ioredis rides
  // on node:net sockets that Workers do not support), so use Upstash's HTTP REST
  // client there instead. Without Upstash credentials the in-memory cache and
  // rate-limit fallbacks take over.
  if (isWorkers) {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      redis = createUpstashClient(url, token);
      logger.info('Redis connected via Upstash REST (Cloudflare Workers)');
    } else if (!lastError) {
      lastError = 'upstash-not-configured';
      logger.warn(
        'UPSTASH_REDIS_REST_URL/TOKEN not configured — caching and rate limiting use in-memory fallbacks',
      );
    }
    return redis;
  }

  if (!env.REDIS_URL) {
    if (!lastError) {
      logger.warn('REDIS_URL is not configured — Redis caching/rate-limiting is disabled');
      lastError = 'not-configured';
    }
    return null;
  }

  try {
    const client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    client.on('error', (err) => {
      lastError = err.message;
      logger.error({ err, component: 'redis' }, 'Redis connection error');
    });
    client.on('ready', () => {
      lastError = undefined;
      logger.info('Redis connected');
    });

    void client.connect().catch((err: Error) => {
      lastError = err.message;
      logger.error({ err, component: 'redis' }, 'Redis connection failed; continuing without cache');
      client.disconnect();
      redis = null;
    });

    redis = client as unknown as AppRedisClient;
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
  if (!isRedisConfigured()) {
    return { connected: false, configured: false, error: lastError ?? 'Redis not configured' };
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
