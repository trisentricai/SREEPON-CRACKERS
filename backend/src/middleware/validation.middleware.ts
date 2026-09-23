import type { Request, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError, zodFieldErrors } from '../utils/http';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates request body/query/params against Zod schemas and replaces the
 * original values with parsed (coerced + stripped) data before controllers run.
 * On failure it throws a 422 ApiError with structured field errors.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).validatedQuery = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any).validatedParams = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors = zodFieldErrors(err);
        const message = Object.values(fieldErrors).flat()[0] ?? 'Validation failed';
        return next(ApiError.unprocessable(message, fieldErrors));
      }
      next(err);
    }
  };
}

/** Helper: read validated query in controllers with full type safety. */
export function getValidatedQuery<T>(req: Request): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).validatedQuery as T;
}