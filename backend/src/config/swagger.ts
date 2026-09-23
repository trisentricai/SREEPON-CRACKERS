import swaggerJsdoc from 'swagger-jsdoc';
import { APP } from './constants';

/**
 * OpenAPI 3.0 spec for the SriPon API.
 * Each module documents its paths/components as it is implemented (Phases 3–8).
 * Base schema is defined here so `/api/openapi.json` and `/api/docs` work from
 * day one.
 */
export const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: `${APP.name} API`,
      version: APP.version,
      description:
        'Central REST API for the SriPon e-commerce platform — crackers & fireworks store.',
      license: { name: 'Proprietary' },
      contact: { name: 'SriPon' },
    },
    servers: [{ url: '/api/v1', description: 'Current version' }],
    components: {
      securitySchemes: {
        firebaseAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID token (customer / mobile app)',
        },
        supabaseAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase access token (admin dashboard)',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated but not authorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
            },
          },
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          required: ['success', 'message', 'data'],
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', nullable: true, example: 'OK' },
            data: {},
          },
        },
        ErrorResponse: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Product is out of stock' },
            errors: {
              type: 'object',
              additionalProperties: { type: 'array', items: { type: 'string' } },
              example: { quantity: ['Only 2 units are available.'] },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'Auth', description: 'Customer authentication (Firebase)' },
      { name: 'Users', description: 'Customer profiles' },
      { name: 'Admins', description: 'Admin authentication & management (Supabase)' },
      { name: 'Products', description: 'Product catalog & management' },
      { name: 'Categories', description: 'Nested category management' },
      { name: 'Inventory', description: 'Stock & inventory transactions' },
      { name: 'Cart', description: 'Server-side cart' },
      { name: 'Wishlist', description: 'Customer wishlist' },
      { name: 'Addresses', description: 'Shipping addresses' },
      { name: 'Orders', description: 'Orders & order lifecycle' },
      { name: 'Payments', description: 'Provider-independent payments & webhooks' },
      { name: 'Coupons', description: 'Discount coupons' },
      { name: 'Banners', description: 'Promotional banners & posters CMS' },
      { name: 'Homepage', description: 'Homepage CMS' },
      { name: 'Notifications', description: 'FCM notifications' },
      { name: 'Analytics', description: 'Admin analytics' },
      { name: 'Settings', description: 'Store settings & legal content' },
    ],
  },
  apis: [],
});