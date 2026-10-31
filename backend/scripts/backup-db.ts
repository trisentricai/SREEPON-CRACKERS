#!/usr/bin/env tsx
/**
 * Database backup script for SriPon.
 *
 * Creates a PostgreSQL backup using `pg_dump` (if available on the host)
 * and falls back to a Prisma-based JSON export otherwise. The result is
 * gzip-compressed and uploaded to Cloudinary as a `raw` resource under
 * `sripon/db-backups/`.
 *
 * Runs in a Node.js environment (Render / local dev) where `DIRECT_DATABASE_URL`
 * is available and `pg_dump` / `psql` can be invoked. Does NOT run on Cloudflare
 * Workers (no shell access, no outbound TCP to arbitrary hosts).
 *
 * Usage:
 *   npx tsx scripts/backup-db.ts
 *
 * Required env:
 *   DATABASE_URL or DIRECT_DATABASE_URL  - PostgreSQL connection string
 *   CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET - Cloudinary credentials
 */

import { execFileSync } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../src/config/env';
import { uploadToCloudinary } from '../src/infrastructure/cloudinary';
import { prisma } from '../src/infrastructure/prisma';
import { logger } from '../src/utils/logger';

const BACKUP_FOLDER = 'sripon/db-backups';

interface BackupResult {
  publicId: string;
  secureUrl: string;
  bytes: number;
  createdAt: string;
  method: 'pg_dump' | 'prisma-export';
}

/** Check whether the `pg_dump` binary is available on this host. */
function hasPgDump(): boolean {
  try {
    execFileSync('pg_dump', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Resolve the best direct (non-pooled) PostgreSQL connection string. */
function dbUrl(): string {
  return env.DIRECT_DATABASE_URL ?? env.DATABASE_URL;
}

/** Backup via pg_dump: stream SQL → gzip → temp file → Cloudinary. */
async function backupWithPgDump(): Promise<BackupResult> {
  const url = dbUrl();
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
  const publicId = `${BACKUP_FOLDER}/db-${timestamp}`;
  const tmpSqlGz = join(tmpdir(), `sripon-backup-${timestamp}.sql.gz`);

  logger.info({ method: 'pg_dump', tmp: tmpSqlGz }, 'Starting pg_dump backup');

  // pg_dump writes plain SQL to stdout; we gzip it and write to a temp file.
  const pgDump = execFileSync(
    'pg_dump',
    ['--dbname', url, '--format', 'plain', '--no-owner', '--no-privileges'],
    {
      env: { ...process.env },
      encoding: 'buffer',
      maxBuffer: 1024 * 1024 * 1024, // 1 GB buffer for large dumps
    },
  );

  await pipeline(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pgDump as unknown as NodeJS.ReadableStream),
    createGzip(),
    createWriteStream(tmpSqlGz),
  );

  const stats = await fs.stat(tmpSqlGz);
  const bytes = stats.size;

  const buffer = await fs.readFile(tmpSqlGz);

  logger.info({ method: 'pg_dump', bytes }, 'pg_dump complete, uploading to Cloudinary');

  const uploaded = await uploadToCloudinary(buffer, {
    folder: BACKUP_FOLDER,
    publicId,
    resourceType: 'raw',
  });

  // Clean up temp file.
  await fs.unlink(tmpSqlGz).catch(() => undefined);

  return {
    publicId: uploaded.publicId,
    secureUrl: uploaded.secureUrl,
    bytes,
    createdAt: new Date().toISOString(),
    method: 'pg_dump',
  };
}

/** Backup via Prisma: export all tables as JSON → gzip → Cloudinary. */
async function backupWithPrisma(): Promise<BackupResult> {
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
  const publicId = `${BACKUP_FOLDER}/db-${timestamp}`;

  logger.info({ method: 'prisma-export' }, 'Starting Prisma-based backup');

  // Export every table the client knows about, in dependency-safe order.
  const tables = [
    'auditLog',
    'deviceToken',
    'notification',
    'homepageSection',
    'banner',
    'couponUsage',
    'coupon',
    'returnRequest',
    'payment',
    'orderItem',
    'order',
    'wishlistItem',
    'cartItem',
    'cart',
    'address',
    'inventoryTransaction',
    'inventoryItem',
    'productImage',
    'product',
    'category',
    'user',
    'admin',
    'siteSetting',
  ];

  const exportData: Record<string, unknown> = {};
  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (prisma as any)[table].findMany();
    exportData[table] = data;
  }

  const json = JSON.stringify(exportData, null, 2);
  const buffer = Buffer.from(json, 'utf8');

  logger.info({ method: 'prisma-export', bytes: buffer.length }, 'Prisma export complete, uploading to Cloudinary');

  const uploaded = await uploadToCloudinary(buffer, {
    folder: BACKUP_FOLDER,
    publicId,
    resourceType: 'raw',
  });

  return {
    publicId: uploaded.publicId,
    secureUrl: uploaded.secureUrl,
    bytes: buffer.length,
    createdAt: new Date().toISOString(),
    method: 'prisma-export',
  };
}

/** Entry point. */
async function main(): Promise<void> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured - cannot store backups');
  }

  const url = dbUrl();
  if (!url) {
    throw new Error('DATABASE_URL / DIRECT_DATABASE_URL is not configured');
  }

  let result: BackupResult;
  if (hasPgDump()) {
    result = await backupWithPgDump();
  } else {
    logger.warn('pg_dump not found on this host; falling back to Prisma JSON export');
    result = await backupWithPrisma();
  }

  logger.info(
    {
      publicId: result.publicId,
      bytes: result.bytes,
      method: result.method,
      url: result.secureUrl,
    },
    'Database backup completed',
  );

  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  logger.error({ err }, 'Database backup failed');
  console.error(err);
  process.exit(1);
});
