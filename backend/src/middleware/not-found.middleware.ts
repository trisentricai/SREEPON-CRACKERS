import type { RequestHandler } from 'express';
import { ApiError } from '../utils/http';

/** 404 handler for unknown routes. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};