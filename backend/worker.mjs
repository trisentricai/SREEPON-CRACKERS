// Cloudflare Workers ESM entry for the SriPon Express API.
//
// The Express app is compiled to CommonJS (`dist/`), but Wrangler requires an
// ES Module entry that exports a real `default` handler — a CommonJS entry is
// treated as a legacy Service Worker script and cannot bundle the `node:*` and
// `cloudflare:*` imports. This file bridges the two worlds:
//
//  1. Import `worker-env` first so Worker bindings reach `process.env` before
//     `src/config/env` is evaluated (it parses `process.env` at module load).
//     ESM sibling modules evaluate in source order.
//  2. Boot the same `createApp()` used by `src/server.ts` (Render) and hand
//     Express a Node HTTP server via Cloudflare's documented
//     `httpServerHandler` bridge.

import './worker-env.mjs';
import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './dist/app.js';
import { runWithRequestPrisma } from './dist/infrastructure/prisma.js';
import { runScheduledMaintenance } from './dist/modules/maintenance/service.js';
import { keepWorkerAlive } from './dist/modules/maintenance/service.js';
import { checkAndDeployLatest } from './dist/modules/maintenance/service.js';
import { runOrderSweep } from './dist/modules/notifications/order-sweep.service.js';
import { APP } from './dist/config/constants.js';
import { env } from './dist/config/env.js';
import { logger } from './dist/utils/logger.js';

const app = createApp();
const server = createServer(app);

// The port is a routing key for httpServerHandler — it is not a network socket.
server.listen(8080);

logger.info(
  { app: APP.name, version: APP.version, env: env.NODE_ENV, platform: 'cloudflare-workers' },
  'SriPon API worker ready',
);

const handler = httpServerHandler({ port: 8080 });

// Each request gets its own Prisma client (see src/infrastructure/prisma.ts):
// Workers closes idle sockets between requests, so a shared client's connection
// would be dead by the next request and every query would hang.
export default {
  fetch(request, env, ctx) {
    return runWithRequestPrisma(() => handler.fetch(request, env, ctx), ctx);
  },

  // Cloudflare Cron Trigger (see `[triggers]` in wrangler.toml). A scheduled
  // event is not an HTTP request, but it needs the same per-invocation Prisma
  // client lifecycle, so it goes through the same helper.
  //
  // The account plan allows 5 cron triggers in total and 3 are already used
  // here, so jobs share a schedule instead of adding a fourth entry.
  async scheduled(controller, env, ctx) {
    const cron = controller.cron;
    // Every 2 minutes: keep the isolate warm and sweep for new orders that
    // missed the inline admin notification in `POST /orders` (safety net).
    if (cron === '*/2 * * * *') {
      await runWithRequestPrisma(async () => {
        await keepWorkerAlive(env);
        await runOrderSweep(cron);
      }, ctx);
      return;
    }
    // Deploy-check: every 10 minutes, verify the latest git commit is deployed;
    // if not, trigger a redeploy via GitHub Actions repository dispatch.
    if (cron === '*/10 * * * *') {
      await runWithRequestPrisma(() => checkAndDeployLatest(env), ctx);
      return;
    }
    // Order expiry: every 30 minutes, cancel stale unpaid orders.
    await runWithRequestPrisma(() => runScheduledMaintenance(cron), ctx);
  },
};