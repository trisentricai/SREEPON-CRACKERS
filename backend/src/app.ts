import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, isProduction } from './config/env';
import { openApiSpec } from './config/swagger';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { healthRouter } from './modules/health';
import { v1Router } from './routes/v1';
import { logger } from './utils/logger';
import { globalLimiter } from './utils/rate-limit';
import { APP } from './config/constants';

/**
 * Builds the SriPon Express application.
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    }),
  );

  app.use(express.json({ limit: '2mb' }));
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

  // --- API routes -----------------------------------------------------
  app.use('/api/v1', v1Router);

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
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: `${APP.name} API Documentation`,
  }));
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // --- Health ----------------------------------------------------------
  app.use(healthRouter);

  // --- 404 & centralized error handling --------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}