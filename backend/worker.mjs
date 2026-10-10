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
};