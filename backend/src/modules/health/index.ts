import { Router } from 'express';
import { APP } from '../../config/constants';
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
  asyncHandler(async (_req, res) => {
    const [db, redis] = await Promise.allSettled([pingDatabase(), pingRedis()]);

    const database =
      db.status === 'fulfilled'
        ? { connected: true }
        : { connected: false, error: (db.reason as Error)?.message ?? 'unknown' };
    const redisResult = redis.status === 'fulfilled' ? redis.value : { connected: false };

    if (!database.connected) {
      logger.warn({ component: 'health', error: database.error }, 'Database health check failed');
    }

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
        },
        'SriPon API is healthy',
      ),
    );
  }),
);