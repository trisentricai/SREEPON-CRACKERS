import pino from 'pino';
import { env, isDev, isTest } from '../config/env';

/**
 * Structured application logger (pino).
 * Never log secrets — this logger is used with redaction for common secret
 * field names as a last line of defense.
 */
export const logger = pino({
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
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      }
    : undefined,
});

/** Child logger bound to a request id. */
export function requestLogger(reqId: string) {
  return logger.child({ reqId });
}

export { env };