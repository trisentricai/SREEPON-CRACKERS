import pino from 'pino';
import { env, isDev, isTest } from '../config/env';

const baseOptions: pino.LoggerOptions = {
  level: isTest ? 'silent' : isDev ? 'debug' : 'info',
  base: { app: 'sripon-api' },
  redact: {
    paths: [
      'password',
      'token',
      'access_token',
      'id_token',
      'authorization',
      'Authorization',
      '*.secret',
      '*.password',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
};

/**
 * Structured application logger (pino).
 * Never log secrets — this logger is used with redaction for common secret
 * field names as a last line of defense.
 *
 * On Cloudflare Workers there is no filesystem and pino's default destination
 * (sonic-boom writing to an fd) is unavailable, so logs go through a plain
 * console sink (workerd captures console output into worker logs).
 */
export const logger =
  env.DEPLOY_TARGET === 'workers'
    ? pino(baseOptions, {
        write: (chunk: string) => console.log(chunk.trimEnd()),
      })
    : pino(
        isDev
          ? {
              ...baseOptions,
              transport: {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
              },
            }
          : baseOptions,
      );

/** Child logger bound to a request id. */
export function requestLogger(reqId: string) {
  return logger.child({ reqId });
}

export { env };