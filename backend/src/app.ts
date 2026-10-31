import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsOrigins, env, isProduction } from './config/env';
import { openApiSpec } from './config/swagger';
import { csrfProtection, issueCsrfToken } from './middleware/csrf.middleware';
import { errorHandler } from './middleware/error.middleware';
import { httpCache } from './middleware/cache.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { healthRouter } from './modules/health';
import { v1Router } from './routes/v1';
import { logger } from './utils/logger';
import { globalLimiter } from './utils/rate-limit';
import { APP } from './config/constants';

/**
 * Builds the Sreepon Express application.
 * Exported separately from the HTTP server so integration tests can inject
 * the app into supertest without opening a port.
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  // --- Security & standard middleware --------------------------------
  app.use(helmet());

  app.use(
    cors({
      origin: isProduction
        ? corsOrigins.length
          ? corsOrigins
          : []
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-CSRF-Token'],
    }),
  );

  app.use(
  express.json({
    limit: '2mb',
    // Preserve the raw bytes so provider webhooks can verify the signature over
    // the exact body the gateway signed (req.body is already parsed JSON).
    verify: (req, _res, buf) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).rawBody = buf;
    },
  }),
);
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // --- Structured request logging -------------------------------------
  app.use(
    pinoHttp({
      logger,
      autoLogging: isProduction,
      customProps: (req, res) => ({ method: req.method, statusCode: res.statusCode }),
    }),
  );

  // --- Global rate limiting (Redis-backed when available) -------------
  app.use(globalLimiter());

  // --- CSRF protection for state-changing requests ----------------------
  app.use(csrfProtection());

  // --- HTTP response caching (Cache-Control headers + Redis) -----------
  // Placed before routes so Cache-Control headers are set on all responses.
  // Only public read-only GET routes are cached (see cache.middleware.ts).
  app.use(httpCache());

  // --- API routes -----------------------------------------------------
  app.use('/api/v1', v1Router);

  // --- CSRF token issuance (GET only, safe method) ----------------------
  app.get('/api/v1/csrf/token', issueCsrfToken);

  // Service info (no secrets).
  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      data: {
        app: APP.name,
        version: APP.version,
        docs: '/api/docs',
        openapi: '/api/openapi.json',
      },
    });
  });

  // --- API documentation (OpenAPI/Swagger) -----------------------------
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // Swagger UI serves static assets from disk, which Cloudflare Workers does
  // not provide — keep the OpenAPI JSON endpoint everywhere, but only mount
  // the interactive UI on Node (Render / local dev).
  //
  // It is required lazily (not imported at the top) because merely importing
  // `swagger-ui-express` evaluates `__dirname` at module scope, which is not
  // defined in the ESM Worker bundle and fails deploys (Cloudflare error 10021).
  if (env.DEPLOY_TARGET !== 'workers') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swaggerUi = require('swagger-ui-express') as typeof import('swagger-ui-express');
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customSiteTitle: `${APP.name} API Documentation`,
    }));
  }

  // --- Health ----------------------------------------------------------
  app.use(healthRouter);

  // --- 404 & centralized error handling --------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}