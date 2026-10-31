#!/usr/bin/env tsx
/**
 * Database restore script for SriPon.
 *
 * Downloads a backup from Cloudinary (by public_id), decompresses it, and
 * restores it into the target PostgreSQL database using `pg_restore` (if
 * available) or falls back to a Prisma-based JSON import.
 *
 * WARNING: This is destructive. It does NOT drop existing data before
 * restoring unless `--drop-first` is passed. Use with caution.
 *
 * Runs in a Node.js environment (Render / local dev) where `DIRECT_DATABASE_URL`
 * is available and `pg_restore` / `psql` can be invoked. Does NOT run on
 * Cloudflare Workers.
 *
 * Usage:
 *   npx tsx scripts/restore-db.ts <public_id> [--drop-first]
 *
 *   public_id - Cloudinary public_id of the backup (e.g.
 *     sripon/db-backups/db-20261031T120000Z)
 *   --drop-first - truncate all tables before restoring (pg_dump path only)
 *
 * Required env:
 *   DATABASE_URL or DIRECT_DATABASE_URL  - PostgreSQL connection string
 *   CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET - Cloudinary credentials
 */

import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, promises as fs } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '../src/config/env';
import { getCloudinary } from '../src/infrastructure/cloudinary';
import { prisma } from '../src/infrastructure/prisma';
import { logger } from '../src/utils/logger';

const BACKUP_FOLDER = 'sripon/db-backups';

/** Resolve the best direct (non-pooled) PostgreSQL connection string. */
function dbUrl(): string {
  return env.DIRECT_DATABASE_URL ?? env.DATABASE_URL;
}

/** Check whether the `pg_restore` binary is available on this host. */
function hasPgRestore(): boolean {
  try {
    execFileSync('pg_restore', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Check whether `psql` is available. */
function hasPsql(): boolean {
  try {
    execFileSync('psql', ['--version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** Download a file from Cloudinary to a temp path. */
async function downloadFromCloudinary(publicId: string): Promise<string> {
  const client = getCloudinary();
  if (!client) {
    throw new Error('Cloudinary is not configured');
  }

  const url = client.url(publicId, {
    resource_type: 'raw',
    type: 'upload',
    sign_url: false,
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download backup from Cloudinary: ${response.status} ${response.statusText}`);
  }

  const tmpPath = join(tmpdir(), `sripon-restore-${Date.now()}.gz`);
  const fileStream = createWriteStream(tmpPath);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await pipeline(response.body as any, fileStream);

  return tmpPath;
}

/** Restore via pg_restore: decompress → pg_restore into target DB. */
async function restoreWithPgRestore(tmpPath: string, dropFirst: boolean): Promise<void> {
  const url = dbUrl();

  if (dropFirst && hasPsql()) {
    // Truncate all tables (dependency-safe order) before restoring.
    const tables = [
      'auditLog', 'deviceToken', 'notification', 'homepageSection', 'banner',
      'couponUsage', 'coupon', 'returnRequest', 'payment', 'orderItem', 'order',
      'wishlistItem', 'cartItem', 'cart', 'address', 'inventoryTransaction',
      'inventoryItem', 'productImage', 'product', 'category', 'user', 'admin',
      'siteSetting',
    ];
    const truncateSql = tables
      .map((t) => `TRUNCATE TABLE "${t}" CASCADE;`)
      .join('\n');
    execFileSync('psql', [url, '-c', truncateSql], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.info({ tableCount: tables.length }, 'Existing tables truncated before restore');
  }

  logger.info({ method: 'pg_restore', tmp: tmpPath }, 'Starting pg_restore');

  // Decompress the .gz file and pipe into pg_restore.
  const restore = spawn('pg_restore', [
    '--dbname', url,
    '--format', 'custom',
    '--no-owner',
    '--no-privileges',
    '--verbose',
    '--exit-on-error',
  ], {
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  await pipeline(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createReadStream(tmpPath).pipe(createGunzip()) as unknown as NodeJS.ReadableStream),
    restore.stdin,
  );
  restore.stdin.end();

  await new Promise<void>((resolve, reject) => {
    restore.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pg_restore exited with code ${code}`));
      } else {
        resolve();
      }
    });
    restore.on('error', reject);
  });

  logger.info({ method: 'pg_restore' }, 'pg_restore complete');
}

/** Restore via Prisma: decompress JSON → import table by table. */
async function restoreWithPrisma(tmpPath: string): Promise<void> {
  logger.info({ method: 'prisma-import', tmp: tmpPath }, 'Starting Prisma-based restore');

  const gzipped = await fs.readFile(tmpPath);
  const decompressed = Buffer.from(await new Promise<Buffer>((resolve, reject) => {
    const gunzip = createGunzip();
    const chunks: Buffer[] = [];
    gunzip.on('data', (c) => chunks.push(c));
    gunzip.on('end', () => resolve(Buffer.concat(chunks)));
    gunzip.on('error', reject);
    gunzip.write(gzipped);
    gunzip.end();
  }));

  const exportData = JSON.parse(decompressed.toString('utf8')) as Record<string, unknown[]>;

  // Import in dependency-safe order (parents before children).
  const tables = [
    'user', 'admin', 'siteSetting', 'category', 'product', 'inventoryItem',
    'productImage', 'inventoryTransaction', 'cart', 'address', 'wishlistItem',
    'order', 'payment', 'orderItem', 'returnRequest', 'coupon', 'couponUsage',
    'banner', 'homepageSection', 'notification', 'deviceToken', 'auditLog',
  ];

  for (const table of tables) {
    const rows = exportData[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createMethod = (prisma as any)[table].create;
    if (!createMethod) {
      logger.warn({ table }, 'Prisma model not found, skipping');
      continue;
    }

    // Prisma create doesn't support bulk insert; insert one by one.
    // For large datasets this is slow, but backups are restored infrequently.
    for (const row of rows) {
      await createMethod({ data: row as Record<string, unknown> }).catch((err: Error) => {
        logger.warn({ table, rowId: (row as Record<string, unknown>).id, err: err.message }, 'Skipped row on restore');
      });
    }

    logger.info({ table, count: rows.length }, 'Table restored');
  }

  logger.info({ method: 'prisma-import' }, 'Prisma-based restore complete');
}

/** Entry point. */
async function main(): Promise<void> {
  const publicId = process.argv[2];
  if (!publicId) {
    throw new Error('Usage: npx tsx scripts/restore-db.ts <cloudinary_public_id> [--drop-first]');
  }

  const dropFirst = process.argv.includes('--drop-first');

  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured - cannot download backups');
  }

  const url = dbUrl();
  if (!url) {
    throw new Error('DATABASE_URL / DIRECT_DATABASE_URL is not configured');
  }

  logger.info({ publicId, dropFirst }, 'Starting database restore');

  const tmpPath = await downloadFromCloudinary(publicId);
  logger.info({ tmp: tmpPath }, 'Backup downloaded from Cloudinary');

  if (hasPgRestore()) {
    await restoreWithPgRestore(tmpPath, dropFirst);
  } else {
    logger.warn('pg_restore not found on this host; falling back to Prisma JSON import');
    await restoreWithPrisma(tmpPath);
  }

  // Clean up temp file.
  await fs.unlink(tmpPath).catch(() => undefined);

  logger.info({ publicId }, 'Database restore completed');
  console.log(`Restore completed: ${publicId}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  logger.error({ err }, 'Database restore failed');
  console.error(err);
  process.exit(1);
});
