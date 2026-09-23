import { Prisma } from '@prisma/client';
import { ApiError, HttpStatus } from './http';
import { logger } from './logger';

/**
 * Translate a Prisma error into a client-safe ApiError.
 * Keeps the "fail closed with a clean envelope" contract when the database
 * rejects an operation.
 */
export function toApiError(err: unknown, context = { resource: 'resource' }): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = Array.isArray(err.meta?.target)
          ? (err.meta.target as string[]).join(', ')
          : 'field';
        return ApiError.conflict(`A record with this ${target} already exists`);
      }
      case 'P2003':
        return ApiError.badRequest('Referenced record does not exist or is in use');
      case 'P2025':
        return ApiError.notFound(`${context.resource} not found`);
      case 'P2014':
        return ApiError.conflict('This change would break an existing relationship');
      default:
        break;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return ApiError.badRequest('Invalid data sent to the database');
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error({ err }, 'database-unavailable');
    return ApiError.serviceUnavailable('Database is temporarily unavailable');
  }

  logger.error({ err }, 'unexpected-database-error');
  return new ApiError('Unexpected database error', HttpStatus.INTERNAL_SERVER_ERROR);
}