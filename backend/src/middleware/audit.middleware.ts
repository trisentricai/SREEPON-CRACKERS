import type { RequestHandler } from 'express';
import { getRedis, invalidateKey } from '../infrastructure/redis';
import type { AuditAction } from '../types/enums';
import { logger } from '../utils/logger';

export interface AuditContext {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Middleware that records a structured audit entry for admin mutations.
 *
 * Persistence of audit entries to the AuditLog table is implemented once the
 * database schema lands (PHASE 2). Until then every admin action is recorded
 * through the structured logger with a stable `audit` schema so the trail is
 * never lost.
 */
export function auditAdmin(action: AuditAction, resource: string): RequestHandler {
  return (req, _res, next) => {
    const adminId = req.admin?.sub ?? 'unknown';
    const ip = req.ip ?? 'unknown';

    const entry: AuditContext & {
      adminId: string;
      ip: string;
      requestId: string;
      route: string;
    } = {
      action,
      resource,
      adminId,
      ip,
      requestId: String(req.id),
      route: req.originalUrl,
    };

    logger.info({ audit: entry }, 'admin-action');

    // Persist to Redis first as a lightweight durable trail; DB persistence
    // (Phase 2+) will also write the canonical AuditLog row transactionally.
    void invalidateKey(`audit:${resource}`).then(() => {
      getRedis()
        ?.rpush('audit:trail', JSON.stringify(entry))
        .catch(() => undefined);
    });

    next();
  };
}