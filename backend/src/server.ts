import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { APP } from './config/constants';
import { shutdownRedis } from './infrastructure/redis';
import { prisma } from './infrastructure/prisma';
import { logger } from './utils/logger';

const app = createApp();
const server = http.createServer(app);

const PORT = env.PORT;
const HOST = env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
  logger.info(
    { port: PORT, app: APP.name, version: APP.version, env: env.NODE_ENV },
    `${APP.name} API listening`,
  );
});

/** Graceful shutdown: stop accepting connections, close infra clients. */
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');

  server.close(async () => {
    await shutdownRedis().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

export { server, app };