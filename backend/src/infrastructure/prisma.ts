import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, isProduction } from '../config/env';

/**
 * Singleton Prisma client.
 * A single shared instance avoids exhausting the database connection pool.
 *
 * Uses the `pg` driver adapter (`@prisma/adapter-pg`) so the same client runs
 * on Node (Render) and on Cloudflare Workers (the binary query engine is not
 * available there — the adapter uses the driver + WASM runtime instead).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrisma(): PrismaClient {
  const options: ConstructorParameters<typeof PrismaClient>[0] = {
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
  };
  // Only attach the adapter when a database URL is present, so the server can
  // still boot with an empty environment and fail closed on first query.
  if (env.DATABASE_URL) {
    options.adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  }
  return new PrismaClient(options);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Cheap health probe: SELECT 1 with a short timeout. Throws if the database is unreachable. */
export async function pingDatabase(): Promise<void> {
  await Promise.race([
    prisma.$queryRaw`SELECT 1`,
    new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000)),
  ]);
}