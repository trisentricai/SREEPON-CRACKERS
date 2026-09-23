import { RedisStore, type RedisReply } from 'rate-limit-redis';
import rateLimit, { type Options } from 'express-rate-limit';
import { getRedis } from '../infrastructure/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export type RateLimitConfig = Partial<Options> & { minutes?: number; limit?: number };

/**
 * Build an express-rate-limit instance.
 * Uses a Redis-backed store when Redis is reachable; otherwise falls back to
 * the in-memory store and logs a warning — never silently disables limiting.
 */
export function createRateLimiter(name: string, { minutes = 10, limit = 100, ...rest }: RateLimitConfig = {}) {
  const client = getRedis();
  let store: RedisStore | undefined;
  if (client && client.status === 'ready') {
    try {
      const rawCall = client.call.bind(client) as (...all: string[]) => Promise<unknown>;
      const sendCommand = async (...args: string[]): Promise<RedisReply> => (await rawCall(...args)) as RedisReply;
      store = new RedisStore({ sendCommand, prefix: `rl:${name}:` });
    } catch (err) {
      logger.warn({ name, err }, `Redis-backed limiter '${name}' unavailable; falling back to in-memory`);
      store = undefined;
    }
  }

  if (!store) {
    logger.warn({ name }, `Rate limiter '${name}' using in-memory store (Redis unavailable)`);
  }

  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      errors: undefined,
    },
    ...rest,
  });
}

/** Strict limiter for authentication endpoints. */
export const loginLimiter = () => createRateLimiter('login', { minutes: 15, limit: 20 });

/** Limiter for password-related endpoints. */
export const passwordLimiter = () => createRateLimiter('password', { minutes: 15, limit: 10 });

/** Limiter for public search endpoints (cheap to abuse). */
export const searchLimiter = () => createRateLimiter('search', { minutes: 1, limit: 60 });

/** Limiter for checkout/payment/coupon endpoints. */
export const checkoutLimiter = () => createRateLimiter('checkout', { minutes: 10, limit: 30 });

/** Limiter for admin APIs. */
export const adminLimiter = () => createRateLimiter('admin', { minutes: 1, limit: 120 });

/** Global default limiter applied to the whole API (unless env NODE_ENV=test). */
export const globalLimiter = () =>
  createRateLimiter('global', { minutes: 1, limit: 600, skip: () => env.NODE_ENV === 'test' });