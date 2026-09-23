import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError } from 'zod';

/** HTTP status codes used throughout the API. */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

/** Field-level validation errors, keyed by field name. */
export type FieldErrors = Record<string, string[]>;

/**
 * Operational error with an HTTP status, structured message, and optional
 * field-level errors. Thrown anywhere in services/controllers and rendered by
 * the centralized error middleware.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors | undefined;

  constructor(message: string, status: HttpStatusCode = HttpStatus.BAD_REQUEST, fieldErrors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  static badRequest(message: string, fieldErrors?: FieldErrors) {
    return new ApiError(message, HttpStatus.BAD_REQUEST, fieldErrors);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(message, HttpStatus.UNAUTHORIZED);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(message, HttpStatus.FORBIDDEN);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(message, HttpStatus.NOT_FOUND);
  }
  static conflict(message: string) {
    return new ApiError(message, HttpStatus.CONFLICT);
  }
  static unprocessable(message: string, fieldErrors?: FieldErrors) {
    return new ApiError(message, HttpStatus.UNPROCESSABLE_ENTITY, fieldErrors);
  }
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new ApiError(message, HttpStatus.TOO_MANY_REQUESTS);
  }
  static serviceUnavailable(message: string) {
    return new ApiError(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
  static notImplemented(resource: string) {
    return new ApiError(`${resource} is not implemented yet`, HttpStatus.NOT_IMPLEMENTED);
  }
}

/** Success envelope — consistent across the whole API. */
export function ok<T>(data: T, message?: string) {
  return { success: true as const, message, data };
}

/** Return a promise-rejection-safe Express request handler. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

/** Read a required path parameter that TypeScript sees as possibly-undefined. */
export function routeParam(req: Request, key: string): string {
  const value = req.params[key];
  if (!value) throw ApiError.badRequest(`Missing required path parameter "${key}"`);
  return value;
}

/** Convert a ZodError into a field->messages map. */
export function zodFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/**
 * Interim handler for endpoints scheduled in later phases.
 * Returns a consistent 501 envelope — replaced with real handlers as modules
 * are implemented.
 */
export function notImplemented(resource: string): RequestHandler {
  return (_req, _res, next) => {
    next(ApiError.notImplemented(resource));
  };
}