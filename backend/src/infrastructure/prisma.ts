import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';

/**
 * Singleton Prisma client.
 * A single shared instance avoids exhausting the database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Cheap health probe: SELECT 1. Throws if the database is unreachable. */
export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}