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
        Pagination: {
          type: 'object',
          required: ['page', 'limit', 'total', 'pages'],
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 42 },
            pages: { type: 'integer', example: 3 },
          },
        },
        Category: {
          type: 'object',
          required: ['id', 'name', 'slug', 'displayOrder', 'isActive', 'isFeatured'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            parentId: { type: 'string', format: 'uuid', nullable: true },
            bannerImageUrl: { type: 'string', format: 'url', nullable: true },
            displayOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            productCount: { type: 'integer' },
          },
        },
        CategoryTreeNode: {
          allOf: [{ $ref: '#/components/schemas/Category' }],
          properties: { children: { type: 'array', items: { $ref: '#/components/schemas/CategoryTreeNode' } } },
        },
        ProductImage: {
          type: 'object',
          required: ['id', 'url', 'displayOrder'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            url: { type: 'string', format: 'url' },
            altText: { type: 'string', nullable: true },
            displayOrder: { type: 'integer' },
          },
        },
        Product: {
          type: 'object',
          required: ['id', 'name', 'slug', 'sku', 'basePrice', 'unit', 'isActive', 'isFeatured'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            shortDescription: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            basePrice: { type: 'string', example: '1250.00' },
            mrpPrice: { type: 'string', nullable: true },
            sku: { type: 'string' },
            unit: { type: 'string', enum: ['BOX', 'PACKET', 'SINGLE', 'OTHER'] },
            piecesPerBox: { type: 'integer', nullable: true },
            weightPerBox: { type: 'string', nullable: true },
            minimumAge: { type: 'integer', nullable: true },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            isApproved: { type: 'boolean' },
            category: { $ref: '#/components/schemas/Category' },
            images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
          },
        },
        PaginatedProducts: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        UserProfile: {
          type: 'object',
          required: ['id', 'email', 'isActive', 'createdAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['idToken'],
          properties: { idToken: { type: 'string', description: 'Firebase ID token' } },
        },
        RegisterRequest: {
          type: 'object',
          required: ['idToken'],
          properties: { idToken: { type: 'string', description: 'Firebase ID token' } },
        },
        PasswordResetRequest: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
      },
    },
    paths: {
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Sign in and bridge the Firebase identity to a local profile',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            '200': { description: 'Signed in (201 when the profile was just created)', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '422': { description: 'Validation failed' },
            '503': { description: 'Firebase is not configured' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register (Firebase account already created client-side)',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } },
          },
          responses: {
            '201': { description: 'Profile created or already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '422': { description: 'Validation failed' },
            '503': { description: 'Firebase is not configured' },
          },
        },
      },
      '/auth/password/reset': {
        post: {
          tags: ['Auth'],
          summary: 'Request a password reset (generic response, no account enumeration)',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetRequest' } } },
          },
          responses: {
            '202': { description: 'Reset processed' },
            '422': { description: 'Validation failed' },
            '503': { description: 'Firebase or reset is not configured' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoke the current customer refresh tokens',
          security: [{ firebaseAuth: [] }],
          responses: {
            '204': { description: 'Tokens revoked' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Current customer profile',
          security: [{ firebaseAuth: [] }],
          responses: {
            '200': { description: 'Profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/categories': {
        get: {
          tags: ['Categories'],
          summary: 'List public categories',
          parameters: [
            { name: 'parentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'includeInactive', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: { '200': { description: 'Categories', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/categories/tree': {
        get: {
          tags: ['Categories'],
          summary: 'Category tree',
          responses: { '200': { description: 'Tree of categories', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/categories/{slug}': {
        get: {
          tags: ['Categories'],
          summary: 'Category by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Category detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/products': {
        get: {
          tags: ['Products'],
          summary: 'List published products (filterable, searchable, paginated)',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'category', in: 'query', schema: { type: 'string', description: 'Category slug or id (includes descendants)' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'featured', in: 'query', schema: { type: 'boolean' } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc', 'featured', 'name_asc'] } },
          ],
          responses: { '200': { description: 'Paginated products', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedProducts' } } } } },
        },
      },
      '/products/search': {
        get: {
          tags: ['Products'],
          summary: 'Search products',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: { '200': { description: 'Paginated results', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedProducts' } } } } },
        },
      },
      '/products/slug/{slug}': {
        get: {
          tags: ['Products'],
          summary: 'Product by slug',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'Product detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/products/{id}': {
        get: {
          tags: ['Products'],
          summary: 'Product by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Product detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
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