import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { isTest } from '../config/env';
import { ZodError } from 'zod';
import { ApiError, HttpStatus, zodFieldErrors } from '../utils/http';
import { logger } from '../utils/logger';

/**
 * Centralized error handler.
 * Renders the SriPon error envelope, never leaks stack traces in production,
 * and logs structured error data with request correlation ids.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  let errors: Record<string, string[]> | undefined;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    errors = err.fieldErrors;
  } else if (err instanceof ZodError) {
    status = HttpStatus.UNPROCESSABLE_ENTITY;
    message = 'Validation failed';
    errors = zodFieldErrors(err);
  } else if (err instanceof SyntaxError) {
    status = HttpStatus.BAD_REQUEST;
    message = 'Malformed request body';
  } else if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    status = HttpStatus.BAD_REQUEST;
    message = 'Request body too large';
  }

  // Only log truly unexpected errors at error level (expected ApiErrors are
  // already logged at the point where they are thrown).
  if (!(err instanceof ApiError)) {
    logger.error(
      {
        err,
        reqId: req.id,
        method: req.method,
        url: req.originalUrl,
        status,
      },
      'unhandled-error',
    );
  }

  const isServerError = status >= 500;

  if (isServerError && !isTest) {
    logger.error(
      { err, reqId: req.id, method: req.method, url: req.originalUrl },
      `server-error (${status})`,
    );
  }

  const body: { success: false; message: string; errors?: Record<string, string[]> } = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };

  if (env.NODE_ENV === 'development' && err instanceof Error && status >= 500) {
    body.message = `${message} :: ${err.message}`;
  }

  res.status(status).json(body);
};