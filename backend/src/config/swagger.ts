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
        CartProductSummary: {
          type: 'object',
          required: ['id', 'name', 'slug', 'basePrice'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            unit: { type: 'string' },
            piecesPerBox: { type: 'integer', nullable: true },
            basePrice: { type: 'string', example: '1250.00' },
            mrpPrice: { type: 'string', nullable: true },
            imageUrl: { type: 'string', format: 'url', nullable: true },
          },
        },
        CartItem: {
          type: 'object',
          required: ['id', 'quantity', 'unit', 'lineTotal', 'product'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer' },
            unit: { type: 'string', enum: ['BOX', 'PACKET', 'SINGLE'] },
            availableStock: { type: 'integer' },
            isOutOfStock: { type: 'boolean' },
            lineTotal: { type: 'string', example: '2500.00' },
            product: { $ref: '#/components/schemas/CartProductSummary' },
          },
        },
        Cart: {
          type: 'object',
          required: ['id', 'currency', 'items', 'subtotal', 'totalQuantity', 'itemCount'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            currency: { type: 'string', example: 'INR' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'string', example: '12500.00' },
            totalQuantity: { type: 'integer' },
            itemCount: { type: 'integer' },
            outOfStockCount: { type: 'integer' },
          },
        },
        CartSummary: {
          type: 'object',
          required: ['currency', 'subtotal', 'totalQuantity', 'itemCount'],
          properties: {
            currency: { type: 'string', example: 'INR' },
            subtotal: { type: 'string' },
            totalQuantity: { type: 'integer' },
            itemCount: { type: 'integer' },
            outOfStockCount: { type: 'integer' },
            outOfStockItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string', format: 'uuid' },
                  productName: { type: 'string' },
                  requested: { type: 'integer' },
                  available: { type: 'integer' },
                },
              },
            },
          },
        },
        AddCartItemRequest: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, maximum: 999 },
            unit: { type: 'string', enum: ['BOX', 'PACKET', 'SINGLE'], default: 'BOX' },
          },
        },
        UpdateCartItemRequest: {
          type: 'object',
          required: ['quantity'],
          properties: { quantity: { type: 'integer', minimum: 1, maximum: 999 } },
        },
        CartLineInput: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, maximum: 999 },
            unit: { type: 'string', enum: ['BOX', 'PACKET', 'SINGLE'], default: 'BOX' },
          },
        },
        MergeCartRequest: {
          type: 'object',
          required: ['items'],
          properties: { items: { type: 'array', items: { $ref: '#/components/schemas/CartLineInput' } } },
        },
        WishlistItem: {
          type: 'object',
          required: ['id', 'addedAt', 'isAvailable', 'product'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            addedAt: { type: 'string', format: 'date-time' },
            isAvailable: { type: 'boolean' },
            availableStock: { type: 'integer' },
            product: { $ref: '#/components/schemas/CartProductSummary' },
          },
        },
        AddWishlistItemRequest: {
          type: 'object',
          required: ['productId'],
          properties: { productId: { type: 'string', format: 'uuid' } },
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
      '/cart': {
        get: {
          tags: ['Cart'],
          summary: 'Current cart with items, pricing and stock availability',
          security: [{ firebaseAuth: [] }],
          responses: {
            '200': { description: 'Cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Clear the cart',
          security: [{ firebaseAuth: [] }],
          responses: { '204': { description: 'Cart cleared' }, '401': { $ref: '#/components/responses/Unauthorized' } },
        },
      },
      '/cart/items': {
        post: {
          tags: ['Cart'],
          summary: 'Add an item (merged by product + unit)',
          security: [{ firebaseAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AddCartItemRequest' } } },
          },
          responses: {
            '201': { description: 'Cart after add', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
            '409': { description: 'Out of stock / requested quantity unavailable' },
          },
        },
      },
      '/cart/items/{itemId}': {
        patch: {
          tags: ['Cart'],
          summary: 'Change a line quantity',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCartItemRequest' } } },
          },
          responses: { '200': { description: 'Cart after update', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Remove a line',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Line removed' }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/cart/merge': {
        post: {
          tags: ['Cart'],
          summary: 'Merge a guest cart into the authenticated cart',
          security: [{ firebaseAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MergeCartRequest' } } },
          },
          responses: {
            '200': { description: 'Cart after merge', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/cart/summary': {
        get: {
          tags: ['Cart'],
          summary: 'Checkout-ready totals (prices backend-authoritative)',
          security: [{ firebaseAuth: [] }],
          responses: {
            '200': { description: 'Cart summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/CartSummary' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/wishlist': {
        get: {
          tags: ['Wishlist'],
          summary: 'Wishlist with product snapshots',
          security: [{ firebaseAuth: [] }],
          responses: {
            '200': { description: 'Wishlist items', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/WishlistItem' } } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/wishlist/items': {
        post: {
          tags: ['Wishlist'],
          summary: 'Add a product to the wishlist (unique per product; 200 if already present)',
          security: [{ firebaseAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AddWishlistItemRequest' } } },
          },
          responses: {
            '201': { description: 'Added', content: { 'application/json': { schema: { $ref: '#/components/schemas/WishlistItem' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/wishlist/items/{productId}': {
        delete: {
          tags: ['Wishlist'],
          summary: 'Remove a product from the wishlist',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Removed' }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/wishlist/items/{productId}/move-to-cart': {
        post: {
          tags: ['Wishlist'],
          summary: 'Move a wishlist product into the cart',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Cart after move', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
            '409': { description: 'Out of stock' },
            '404': { $ref: '#/components/responses/NotFound' },
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