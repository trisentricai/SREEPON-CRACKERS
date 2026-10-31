import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../infrastructure/prisma';
import { AuditAction, AuditActorType, OrderStatus, PaymentStatus } from '../../types/enums';
import { logger } from '../../utils/logger';

/**
 * Scheduled maintenance.
 *
 * Everything here must be safe to run repeatedly and concurrently: it is
 * invoked by a Cloudflare Cron Trigger (see `[triggers]` in wrangler.toml),
 * by the admin dashboard on demand, and by any external scheduler you point at
 * `POST /admin/maintenance/expire-orders`.
 *
 * The job that matters in production is order expiry. Stock is reserved the
 * moment an order is created (orders/service.ts `reserveStock`), so an
 * abandoned online checkout keeps those units unsellable forever unless
 * something releases them. Nothing else in the codebase does.
 */

export interface ExpireStaleOrdersOptions {
  /** Only orders older than this are considered. Defaults to `ORDER_PAYMENT_WINDOW_MINUTES`. */
  olderThanMinutes?: number;
  /** Maximum orders handled in this run. */
  limit?: number;
}

export interface ExpireStaleOrdersResult {
  windowMinutes: number;
  cutoff: string;
  scanned: number;
  cancelled: number;
  failed: number;
  reservationsReleased: number;
  paymentsExpired: number;
  orderNumbers: string[];
}

/**
 * Hard ceiling on one run so a cron invocation stays well inside the Worker's
 * CPU/query budget. The job runs every 30 minutes, so a large backlog still
 * drains quickly without a single long-running batch.
 */
export const MAX_BATCH_SIZE = 100;

/** The instant before which an unpaid order counts as stale. */
export function cutoffFor(windowMinutes: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - windowMinutes * 60_000);
}

/**
 * Which orders the expiry job is allowed to cancel. Exported and pure so the
 * rule is unit-tested without touching the database.
 *
 * Cash-on-delivery orders are deliberately excluded: they are never paid
 * online, so their payment status legitimately stays PENDING until delivery
 * and the admin owns them.
 */
export function staleOrderFilter(cutoff: Date): Prisma.OrderWhereInput {
  return {
    status: OrderStatus.PENDING,
    paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
    createdAt: { lt: cutoff },
    payments: { none: { provider: 'cash' } },
  };
}

type StaleOrder = {
  id: string;
  orderNumber: string;
  items: Array<{ productId: string | null; quantity: number }>;
};

type ExpireOutcome = {
  cancelled: boolean;
  reservationsReleased: number;
  paymentsExpired: number;
};

/**
 * Cancel one order and release whatever it was holding. The transaction
 * re-reads the order, so a payment that lands between the scan and this call
 * wins: an order that has gone PAID (or left PENDING) is left untouched.
 */
async function expireOne(order: StaleOrder, windowMinutes: number): Promise<ExpireOutcome> {
  const skipped: ExpireOutcome = { cancelled: false, reservationsReleased: 0, paymentsExpired: 0 };

  return prisma.$transaction(async (tx) => {
    const live = await tx.order.findUnique({
      where: { id: order.id },
      select: { status: true, paymentStatus: true },
    });
    if (!live || live.status !== OrderStatus.PENDING) return skipped;
    if (live.paymentStatus !== PaymentStatus.PENDING && live.paymentStatus !== PaymentStatus.FAILED) {
      return skipped;
    }

    // Belt and braces: never cancel an order that has been paid, whatever the
    // denormalised paymentStatus says.
    const paidPayments = await tx.payment.count({
      where: { orderId: order.id, status: PaymentStatus.PAID },
    });
    if (paidPayments > 0) return skipped;

    let reservationsReleased = 0;
    for (const item of order.items) {
      if (!item.productId) continue;
      // Same guard as orders/service.ts releaseReservation(): never push
      // reservedQuantity below zero.
      reservationsReleased += await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "reservedQuantity" = "reservedQuantity" - ${item.quantity}
        WHERE "productId" = ${item.productId} AND "reservedQuantity" >= ${item.quantity}
      `;
    }

    const paymentsExpired = await tx.payment.updateMany({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    });

    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: now,
        cancelReason: `Payment not completed within ${windowMinutes} minutes`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.ORDER_STATUS_CHANGED,
        resource: `order:${order.id}`,
        summary: `Order status PENDING -> CANCELLED (unpaid after ${windowMinutes} minutes)`,
        metadata: {
          from: OrderStatus.PENDING,
          to: OrderStatus.CANCELLED,
          reason: 'payment_window_expired',
          windowMinutes,
          reservationsReleased,
          paymentsExpired: paymentsExpired.count,
        },
      },
    });

    return { cancelled: true, reservationsReleased, paymentsExpired: paymentsExpired.count };
  });
}

/**
 * Cancel abandoned unpaid orders and release their reserved stock.
 * Idempotent: an order already cancelled (by a customer, an admin or an
 * earlier run) no longer matches `staleOrderFilter`.
 */
export async function expireStaleOrders(
  options: ExpireStaleOrdersOptions = {},
): Promise<ExpireStaleOrdersResult> {
  const windowMinutes = Math.max(
    1,
    Math.trunc(options.olderThanMinutes ?? env.ORDER_PAYMENT_WINDOW_MINUTES),
  );
  const limit = Math.min(Math.max(1, Math.trunc(options.limit ?? MAX_BATCH_SIZE)), MAX_BATCH_SIZE);
  const cutoff = cutoffFor(windowMinutes);

  const candidates = await prisma.order.findMany({
    where: staleOrderFilter(cutoff),
    select: {
      id: true,
      orderNumber: true,
      items: { select: { productId: true, quantity: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const result: ExpireStaleOrdersResult = {
    windowMinutes,
    cutoff: cutoff.toISOString(),
    scanned: candidates.length,
    cancelled: 0,
    failed: 0,
    reservationsReleased: 0,
    paymentsExpired: 0,
    orderNumbers: [],
  };

  for (const candidate of candidates) {
    try {
      const outcome = await expireOne(candidate, windowMinutes);
      if (!outcome.cancelled) continue;
      result.cancelled += 1;
      result.reservationsReleased += outcome.reservationsReleased;
      result.paymentsExpired += outcome.paymentsExpired;
      result.orderNumbers.push(candidate.orderNumber);
    } catch (err) {
      // One bad order must not stop the rest of the batch.
      result.failed += 1;
      logger.error(
        { err, orderId: candidate.id, orderNumber: candidate.orderNumber },
        'order expiry failed for one order',
      );
    }
  }

  return result;
}

/**
 * Entry point for a cron trigger. Throws on database failure so the platform
 * records the run as failed instead of silently doing nothing.
 */
export async function runScheduledMaintenance(cron: string): Promise<ExpireStaleOrdersResult> {
  const startedAt = Date.now();
  try {
    const result = await expireStaleOrders();
    logger.info(
      { cron, durationMs: Date.now() - startedAt, ...result },
      'scheduled maintenance finished',
    );
    return result;
  } catch (err) {
    logger.error({ err, cron, durationMs: Date.now() - startedAt }, 'scheduled maintenance failed');
    throw err;
  }
}

/** Cloudflare Workers API base URL for self-pings. */
const WORKER_BASE_URL = 'https://sreepon-api.trisentricai.workers.dev';

/**
 * Keep-alive: hit the /health endpoint every 5 minutes to prevent the Worker
 * from going cold. The response is discarded; we only care that the isolate
 * stays warm.
 */
export async function keepWorkerAlive(_env: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(`${WORKER_BASE_URL}/health`);
    logger.info(
      { status: response.status, url: `${WORKER_BASE_URL}/health` },
      'keep-alive ping',
    );
  } catch (err) {
    logger.warn({ err }, 'keep-alive ping failed');
  }
}

/**
 * Check whether the latest git commit is deployed on this Worker. If not,
 * trigger a redeploy via GitHub Actions repository dispatch.
 *
 * How it works:
 *   1. Fetch the latest commit SHA from the GitHub API.
 *   2. Compare it with `DEPLOYED_COMMIT_SHA` (an env var set at deploy time
 *      by wrangler deploy or the CI workflow).
 *   3. If they differ, send a repository_dispatch event to GitHub with
 *      event_type="redeploy", which triggers the deploy.yml workflow.
 *
 * Requires env vars:
 *   GITHUB_REPO_OWNER  (e.g. "trisentricai")
 *   GITHUB_REPO_NAME   (e.g. "SREEPON-CRACKERS")
 *   GITHUB_TOKEN       (a PAT with repo scope, for the dispatch)
 *   DEPLOYED_COMMIT_SHA (set by the deploy workflow after a successful deploy)
 */
export async function checkAndDeployLatest(_env: Record<string, unknown>): Promise<void> {
  const owner = String(_env.GITHUB_REPO_OWNER ?? 'trisentricai');
  const repo = String(_env.GITHUB_REPO_NAME ?? 'SREEPON-CRACKERS');
  const token = String(_env.GITHUB_TOKEN ?? '');
  const deployedSha = String(_env.DEPLOYED_COMMIT_SHA ?? '');

  if (!token) {
    logger.warn({ component: 'maintenance' }, 'deploy-check: GITHUB_TOKEN not set, skipping');
    return;
  }

  try {
    // Fetch the latest commit on the default branch (master).
    const latestResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/master`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'sreepon-deploy-check',
        },
      },
    );

    if (!latestResponse.ok) {
      logger.warn(
        { status: latestResponse.status, owner, repo },
        'deploy-check: failed to fetch latest commit',
      );
      return;
    }

    const latest = (await latestResponse.json()) as { sha?: string };
    const latestSha = latest.sha;

    if (!latestSha) {
      logger.warn({ owner, repo }, 'deploy-check: latest commit SHA missing');
      return;
    }

    // If the deployed SHA matches the latest, nothing to do.
    if (deployedSha && deployedSha === latestSha) {
      logger.info({ deployedSha, latestSha }, 'deploy-check: already up to date');
      return;
    }

    // Trigger a redeploy via GitHub Actions repository dispatch.
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/dispatches`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'sreepon-deploy-check',
        },
        body: JSON.stringify({
          event_type: 'redeploy',
          client_payload: {
            latest_sha: latestSha,
            triggered_by: 'cron-deploy-check',
          },
        }),
      },
    );

    if (!dispatchResponse.ok) {
      logger.warn(
        { status: dispatchResponse.status, owner, repo, latestSha },
        'deploy-check: failed to trigger redeploy dispatch',
      );
      return;
    }

    logger.info(
      { deployedSha, latestSha, owner, repo },
      'deploy-check: redeploy triggered via GitHub Actions',
    );
  } catch (err) {
    logger.error({ err, owner, repo }, 'deploy-check: unexpected error');
  }
}
