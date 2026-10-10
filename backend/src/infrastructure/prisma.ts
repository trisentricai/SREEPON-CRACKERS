import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, isProduction, isWorkers } from '../config/env';

/**
 * Prisma client access.
 *
 * Node/Render uses a single shared instance (a pooled connection is fine and
 * avoids exhausting the database connection pool there).
 *
 * Cloudflare Workers cannot reuse a connection across requests: the runtime
 * closes idle sockets when a request finishes, but `pg` keeps the dead socket
 * in its pool and hands it to the next query — which then hangs forever
 * (`The Workers runtime canceled this request because it detected that your
 * Worker's code had hung`). The symptom is easy to recognise: requests
 * alternate success/failure, because a fresh connection works while a reused
 * idle one hangs. On Workers we therefore create a client per request (opened
 * inside the request's I/O context) and disconnect it once the response is
 * produced.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let client: PrismaClient | undefined;

export function createPrisma(): PrismaClient {
  const options: ConstructorParameters<typeof PrismaClient>[0] = {
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
  };
  // Only attach the adapter when a database URL is present, so the server can
  // still boot with an empty environment and fail closed on first query.
  if (env.DATABASE_URL) {
    options.adapter = new PrismaPg(
      isWorkers
        ? // `max: 1` serialises concurrent queries (e.g. `Promise.all([count,
          // findMany])`) onto the single request-scoped connection instead of
          // opening a second socket mid-request.
          { connectionString: env.DATABASE_URL, max: 1 }
        : { connectionString: env.DATABASE_URL },
    );
  }
  return new PrismaClient(options);
}

interface RequestPrismaStore {
  client?: PrismaClient;
}

const requestStorage = new AsyncLocalStorage<RequestPrismaStore>();

function singletonClient(): PrismaClient {
  if (client) return client;
  client = globalForPrisma.prisma ?? createPrisma();
  return client;
}

function currentClient(): PrismaClient {
  if (isWorkers) {
    const store = requestStorage.getStore();
    if (store) {
      store.client ??= createPrisma();
      return store.client;
    }
  }
  return singletonClient();
}

/** Minimal `ExecutionContext` shape (Cloudflare) — avoids a hard type dependency. */
export interface WaitUntilContext {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Run `fn` with a request-scoped Prisma client on Workers, disconnecting it
 * afterwards (via `ctx.waitUntil` so the disconnect outlives the response).
 * A no-op passthrough on Node/Render.
 */
export async function runWithRequestPrisma<T>(
  fn: () => Promise<T>,
  ctx?: WaitUntilContext,
): Promise<T> {
  if (!isWorkers) return fn();
  const store: RequestPrismaStore = {};
  try {
    return await requestStorage.run(store, fn);
  } finally {
    const scoped = store.client;
    if (scoped) {
      const dispose = scoped.$disconnect().catch(() => undefined);
      if (ctx) ctx.waitUntil(dispose);
      else await dispose;
    }
  }
}

/**
 * Lazy Prisma proxy.
 *
 * Deferring construction matters on Workers for two reasons: `new
 * PrismaClient()` loads the WASM query engine, which schedules a `setTimeout`
 * during initialisation (forbidden in the global scope, so an eager client
 * traps the isolate at boot); and the client must be created inside a request
 * so its connection belongs to that request's I/O context.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop): unknown {
    const instance = currentClient() as unknown as Record<PropertyKey, unknown>;
    const value = instance[prop];
    // Bind methods so `prisma.$transaction`, `prisma.$queryRaw` (tagged
    // template) and friends keep their `this` when called off the proxy.
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
}) as PrismaClient;

// Warm the Node/Render singleton in development only; on Workers the client is
// created per request, and constructing it at module load is forbidden.
if (!isProduction && !isWorkers) {
  globalForPrisma.prisma = singletonClient();
}

/** Cheap health probe: SELECT 1 with a short timeout. Throws if the database is unreachable. */
export async function pingDatabase(): Promise<void> {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000)),
  ]);
}
