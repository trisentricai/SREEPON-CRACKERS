import { Router } from 'express';
import { APP } from '../../config/constants';
import { env } from '../../config/env';
import { pingDatabase } from '../../infrastructure/prisma';
import { pingRedis } from '../../infrastructure/redis';
import { asyncHandler, ok } from '../../utils/http';
import { logger } from '../../utils/logger';

/**
 * Health endpoint used by Render and uptime monitors.
 * Reports connectivity for dependent services but never fails the request on
 * infrastructure degradation (the API keeps serving).
 */
export const healthRouter = Router();

healthRouter.get(
  '/health',
  asyncHandler(async (req, res) => {
    const [db, redis] = await Promise.allSettled([pingDatabase(), pingRedis()]);

    const database =
      db.status === 'fulfilled'
        ? { connected: true }
        : { connected: false, error: (db.reason as Error)?.message ?? 'unknown' };
    const redisResult = redis.status === 'fulfilled' ? redis.value : { connected: false };

    if (!database.connected) {
      logger.warn({ component: 'health', error: database.error }, 'Database health check failed');
    }

    // Opt-in diagnostics (`/health?debug=1`): report which keys the app parsed
    // at module load vs. which string bindings the request actually carried.
    // Booleans/key names only — never values.
    const debug =
      String(req.query.debug) === '1'
        ? {
            parsedEnv: {
              hasDatabaseUrl: Boolean(env.DATABASE_URL),
              hasUpstashUrl: Boolean(env.UPSTASH_REDIS_REST_URL),
              hasUpstashToken: Boolean(env.UPSTASH_REDIS_REST_TOKEN),
              hasJwtSecret: Boolean(env.JWT_SECRET),
              deployTarget: env.DEPLOY_TARGET,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestEnv: (globalThis as any).__cfEnvDebug ?? null,
          }
        : undefined;

    res.status(200).json(
      ok(
        {
          app: APP.name,
          version: APP.version,
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: {
            database,
            redis: redisResult,
          },
          ...(debug ? { debug } : {}),
        },
        'SriPon API is healthy',
      ),
    );
  }),
);