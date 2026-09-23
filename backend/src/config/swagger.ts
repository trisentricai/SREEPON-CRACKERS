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
        OrderItemView: {
          type: 'object',
          required: ['id', 'productName', 'sku', 'unit', 'quantity', 'unitPrice', 'lineTotal'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid', nullable: true },
            productName: { type: 'string' },
            productSlug: { type: 'string' },
            sku: { type: 'string' },
            unit: { type: 'string' },
            quantity: { type: 'integer' },
            unitPrice: { type: 'string', example: '1250.00' },
            lineTotal: { type: 'string', example: '2500.00' },
            imageUrl: { type: 'string', format: 'url', nullable: true },
          },
        },
        PaymentView: {
          type: 'object',
          required: ['id', 'orderId', 'provider', 'amount', 'status'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            provider: { type: 'string', enum: ['razorpay', 'stripe', 'mock', 'cash'] },
            amount: { type: 'string', example: '1250.00' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
            providerRefId: { type: 'string', nullable: true },
            clientPayload: { type: 'object', nullable: true },
            paidAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          required: ['id', 'orderNumber', 'status', 'paymentStatus', 'grandTotal', 'items'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string', example: 'SP-20260924-143012-AB12' },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'] },
            paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
            currency: { type: 'string', example: 'INR' },
            subtotal: { type: 'string', example: '2500.00' },
            discount: { type: 'string', example: '0.00' },
            tax: { type: 'string', example: '0.00' },
            deliveryFee: { type: 'string', example: '0.00' },
            grandTotal: { type: 'string', example: '2500.00' },
            coupon: { type: 'object', nullable: true, properties: { id: { type: 'string', format: 'uuid' }, code: { type: 'string' } } },
            address: { type: 'object', additionalProperties: true },
            notes: { type: 'string', nullable: true },
            cancelReason: { type: 'string', nullable: true },
            cancelledAt: { type: 'string', format: 'date-time', nullable: true },
            deliveredAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            customer: { type: 'object', nullable: true, properties: { email: { type: 'string', format: 'email' }, name: { type: 'string', nullable: true } } },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItemView' } },
            payments: { type: 'array', items: { $ref: '#/components/schemas/PaymentView' } },
            returnRequests: { type: 'array', items: { type: 'object' } },
          },
        },
        OrderList: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        OrderInvoice: {
          type: 'object',
          required: ['invoiceNumber', 'issuedAt', 'order'],
          properties: {
            invoiceNumber: { type: 'string' },
            issuedAt: { type: 'string', format: 'date-time' },
            order: { $ref: '#/components/schemas/Order' },
          },
        },
        CreateOrderAddress: {
          type: 'object',
          required: ['fullName', 'phone', 'line1', 'city', 'state', 'pincode'],
          properties: {
            label: { type: 'string' },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            country: { type: 'string', default: 'IN' },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          properties: {
            address: { $ref: '#/components/schemas/CreateOrderAddress' },
            addressId: { type: 'string', format: 'uuid' },
            couponCode: { type: 'string' },
          },
        },
        CancelOrderRequest: {
          type: 'object',
          properties: { reason: { type: 'string' } },
        },
        ReturnRequestInput: {
          type: 'object',
          required: ['reason'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            reason: { type: 'string' },
          },
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'] },
            reason: { type: 'string' },
          },
        },
        UpdatePaymentStatusRequest: {
          type: 'object',
          required: ['paymentStatus'],
          properties: {
            paymentStatus: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
          },
        },
        AdminOrderNoteRequest: {
          type: 'object',
          required: ['note'],
          properties: { note: { type: 'string' } },
        },
        CreatePaymentRequest: {
          type: 'object',
          required: ['orderId', 'provider'],
          properties: {
            orderId: { type: 'string', format: 'uuid' },
            provider: { type: 'string', enum: ['razorpay', 'stripe', 'mock', 'cash'] },
          },
        },
        Coupon: {
          type: 'object',
          required: ['id', 'code', 'type', 'value', 'isActive'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string', example: 'DIWALI10' },
            type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
            value: { type: 'string', example: '10.00' },
            maxDiscount: { type: 'string', nullable: true },
            minOrderValue: { type: 'string', nullable: true },
            usageLimit: { type: 'integer', nullable: true },
            perUserLimit: { type: 'integer' },
            startAt: { type: 'string', format: 'date-time', nullable: true },
            endAt: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            usedCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CouponList: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Coupon' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        ValidateCouponRequest: {
          type: 'object',
          required: ['code', 'orderSubtotal'],
          properties: {
            code: { type: 'string' },
            orderSubtotal: { type: 'number' },
          },
        },
        ValidateCouponResult: {
          type: 'object',
          required: ['coupon', 'subtotal', 'discount', 'finalTotal'],
          properties: {
            coupon: { $ref: '#/components/schemas/Coupon' },
            subtotal: { type: 'string', example: '2500.00' },
            discount: { type: 'string', example: '250.00' },
            finalTotal: { type: 'string', example: '2250.00' },
          },
        },
        CreateCouponRequest: {
          type: 'object',
          required: ['code', 'type', 'value'],
          properties: {
            code: { type: 'string' },
            type: { type: 'string', enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
            value: { type: 'number' },
            maxDiscount: { type: 'number' },
            minOrderValue: { type: 'number' },
            usageLimit: { type: 'integer' },
            perUserLimit: { type: 'integer', default: 1 },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean', default: true },
          },
        },
        UpdateCouponRequest: { $ref: '#/components/schemas/CreateCouponRequest' },
        Banner: {
          type: 'object',
          required: ['id', 'placement', 'title', 'imageUrl', 'actionType', 'displayOrder', 'isActive'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            placement: { type: 'string', enum: ['HOME_HERO', 'HOME_SECONDARY', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY_TOP', 'PRODUCT_PROMOTION', 'APP_HOME'] },
            title: { type: 'string' },
            subtitle: { type: 'string', nullable: true },
            imageUrl: { type: 'string', format: 'url' },
            actionType: { type: 'string', enum: ['LINKED_PRODUCT', 'LINKED_CATEGORY', 'CUSTOM_URL'] },
            actionTarget: { type: 'string', nullable: true },
            category: {
              type: 'object',
              nullable: true,
              required: ['id', 'name', 'slug'],
              properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, slug: { type: 'string' } },
            },
            displayOrder: { type: 'integer' },
            startAt: { type: 'string', format: 'date-time', nullable: true },
            endAt: { type: 'string', format: 'date-time', nullable: true },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BannerList: {
          type: 'object',
          required: ['items', 'pagination'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/Banner' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        CreateBannerRequest: {
          type: 'object',
          required: ['placement', 'title', 'imageUrl', 'actionType'],
          properties: {
            placement: { type: 'string', enum: ['HOME_HERO', 'HOME_SECONDARY', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY_TOP', 'PRODUCT_PROMOTION', 'APP_HOME'] },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            imageUrl: { type: 'string', format: 'url' },
            actionType: { type: 'string', enum: ['LINKED_PRODUCT', 'LINKED_CATEGORY', 'CUSTOM_URL'] },
            actionTarget: { type: 'string', description: 'Required unless actionType is LINKED_CATEGORY' },
            categoryId: { type: 'string', format: 'uuid', description: 'Required for LINKED_CATEGORY banners' },
            displayOrder: { type: 'integer', default: 0 },
            startAt: { type: 'string', format: 'date-time' },
            endAt: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean', default: true },
          },
        },
        UpdateBannerRequest: { $ref: '#/components/schemas/CreateBannerRequest' },
        ActivateBannerRequest: {
          type: 'object',
          required: ['isActive'],
          properties: { isActive: { type: 'boolean' } },
        },
        ReorderBannersRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'displayOrder'],
                properties: { id: { type: 'string', format: 'uuid' }, displayOrder: { type: 'integer' } },
              },
            },
          },
        },
        HomepageSection: {
          type: 'object',
          required: ['id', 'type', 'displayOrder', 'isActive'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['HERO', 'CATEGORY_GRID', 'PRODUCT_CAROUSEL', 'FEATURED_PRODUCTS', 'BEST_SELLERS', 'NEW_ARRIVALS', 'PROMOTION', 'CUSTOM_COLLECTION'] },
            title: { type: 'string', nullable: true },
            config: { type: 'object', nullable: true },
            displayOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        HomepageConfig: {
          type: 'object',
          properties: {
            heroTitle: { type: 'string' },
            heroTagline: { type: 'string' },
          },
        },
        Homepage: {
          type: 'object',
          required: ['config', 'sections', 'banners'],
          properties: {
            config: { $ref: '#/components/schemas/HomepageConfig' },
            sections: {
              type: 'array',
              items: {
                allOf: [{ $ref: '#/components/schemas/HomepageSection' }],
                properties: { content: { type: 'object' } },
              },
            },
            banners: {
              type: 'array',
              items: {
                type: 'object',
                required: ['placement', 'items'],
                properties: {
                  placement: { type: 'string' },
                  items: { type: 'array', items: { $ref: '#/components/schemas/Banner' } },
                },
              },
            },
          },
        },
        CreateSectionRequest: {
          type: 'object',
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['HERO', 'CATEGORY_GRID', 'PRODUCT_CAROUSEL', 'FEATURED_PRODUCTS', 'BEST_SELLERS', 'NEW_ARRIVALS', 'PROMOTION', 'CUSTOM_COLLECTION'] },
            title: { type: 'string' },
            config: { type: 'object' },
            displayOrder: { type: 'integer', default: 0 },
            isActive: { type: 'boolean', default: true },
          },
        },
        UpdateSectionRequest: { $ref: '#/components/schemas/CreateSectionRequest' },
        ReorderSectionsRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'displayOrder'],
                properties: { id: { type: 'string', format: 'uuid' }, displayOrder: { type: 'integer' } },
              },
            },
          },
        },
        StoreSettingsView: {
          type: 'object',
          required: ['name', 'currency', 'maintenanceMode'],
          properties: {
            name: { type: 'string' },
            tagline: { type: 'string' },
            supportEmail: { type: 'string' },
            supportPhone: { type: 'string' },
            currency: { type: 'string' },
            maintenanceMode: { type: 'boolean' },
          },
        },
        DeliverySettingsView: {
          type: 'object',
          required: ['enabled', 'deliveryFee'],
          properties: {
            enabled: { type: 'boolean' },
            deliveryFee: { type: 'string' },
            freeShippingAbove: { type: 'string', nullable: true },
            deliveryNote: { type: 'string' },
          },
        },
        TaxSettingsView: {
          type: 'object',
          required: ['enabled', 'rate'],
          properties: {
            enabled: { type: 'boolean' },
            rate: { type: 'number' },
            gstin: { type: 'string', nullable: true },
            taxInclusive: { type: 'boolean' },
          },
        },
        SocialSettingsView: {
          type: 'object',
          properties: {
            facebookUrl: { type: 'string', format: 'uri', nullable: true },
            instagramUrl: { type: 'string', format: 'uri', nullable: true },
            youtubeUrl: { type: 'string', format: 'uri', nullable: true },
            tiktokUrl: { type: 'string', format: 'uri', nullable: true },
            whatsappNumber: { type: 'string', nullable: true },
          },
        },
        LegalPage: {
          type: 'object',
          required: ['title', 'body'],
          properties: { title: { type: 'string' }, body: { type: 'string' } },
        },
        PublicSettings: {
          type: 'object',
          properties: {
            store: { $ref: '#/components/schemas/StoreSettingsView' },
            delivery: { $ref: '#/components/schemas/DeliverySettingsView' },
            tax: { $ref: '#/components/schemas/TaxSettingsView' },
            social: { $ref: '#/components/schemas/SocialSettingsView' },
          },
        },
        UpdateSettingsRequest: {
          type: 'object',
          properties: {
            store: { type: 'object', description: 'Store identity & support details' },
            delivery: { type: 'object', description: 'Delivery enabled / fee / free-shipping threshold' },
            tax: { type: 'object', description: 'Tax rate, GSTIN, inclusion mode' },
            social: { type: 'object', description: 'Social links & WhatsApp number' },
            legal: { type: 'object', description: 'Legal policies & notices' },
          },
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
      '/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Place an order from the cart (backend-priced, stock reserved)',
          security: [{ firebaseAuth: [] }],
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderRequest' } } },
          },
          responses: {
            '201': { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
            '409': { description: 'Empty cart / insufficient stock / coupon ineligible' },
          },
        },
        get: {
          tags: ['Orders'],
          summary: 'List my orders',
          security: [{ firebaseAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: { '200': { description: 'Paginated orders', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' } } } } },
        },
      },
      '/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Order detail (own orders only)',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/orders/{id}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Cancel an unpaid order before it ships (releases reserved stock)',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelOrderRequest' } } } },
          responses: { '200': { description: 'Cancelled order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '409': { description: 'Not cancelable (already paid / shipped / cancelled)' } },
        },
      },
      '/orders/{id}/return-request': {
        post: {
          tags: ['Orders'],
          summary: 'Request a return for a delivered order (per product optional)',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ReturnRequestInput' } } } },
          responses: { '200': { description: 'Order moved to RETURN_REQUESTED', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '409': { description: 'Not delivered or return already requested' } },
        },
      },
      '/orders/{id}/invoice': {
        get: {
          tags: ['Orders'],
          summary: 'Immovable snapshot order invoice',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderInvoice' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/admin/orders': {
        get: {
          tags: ['Orders'],
          summary: 'All orders (paginated, filterable)',
          security: [{ supabaseAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED'] } },
            { name: 'paymentStatus', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
            { name: 'q', in: 'query', schema: { type: 'string', description: 'Order number or customer email' } },
          ],
          responses: { '200': { description: 'Paginated orders', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' } } } } },
        },
      },
      '/admin/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Order detail for admins',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/admin/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Advance the order lifecycle (validated transitions, inventory effects)',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateOrderStatusRequest' } } } },
          responses: { '200': { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '409': { description: 'Invalid transition' } },
        },
      },
      '/admin/orders/{id}/payment-status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update payment status (mark paid for offline / refunds)',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePaymentStatusRequest' } } } },
          responses: { '200': { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '409': { description: 'Invalid transition' } },
        },
      },
      '/admin/orders/{id}/notes': {
        post: {
          tags: ['Orders'],
          summary: 'Append an order note (audit trail plain text)',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminOrderNoteRequest' } } } },
          responses: { '200': { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/admin/orders/{id}/invoice': {
        get: {
          tags: ['Orders'],
          summary: 'Printable invoice for an order',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Invoice', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderInvoice' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/payments': {
        post: {
          tags: ['Payments'],
          summary: 'Create a backend-priced payment intent for an order',
          security: [{ firebaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } } } },
          responses: {
            '201': { description: 'Payment initiated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentView' } } } },
            '403': { description: 'Payment provider not configured' },
            '409': { description: 'Order already paid or amount zero' },
          },
        },
      },
      '/payments/{id}': {
        get: {
          tags: ['Payments'],
          summary: 'Payment status (own orders only)',
          security: [{ firebaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Payment status', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentView' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/payments/webhooks/{provider}': {
        post: {
          tags: ['Payments'],
          summary: 'Payment gateway webhook (signature-verified; the only way an order is marked paid)',
          parameters: [{ name: 'provider', in: 'path', required: true, schema: { type: 'string', enum: ['razorpay', 'stripe', 'mock'] } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { '200': { description: 'Webhook processed', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentView' } } } }, '400': { description: 'Missing/invalid signature or payload' } },
        },
      },
      '/coupons/validate': {
        post: {
          tags: ['Coupons'],
          summary: 'Validate a coupon during checkout (server-side rules)',
          security: [{ firebaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateCouponRequest' } } } },
          responses: {
            '200': { description: 'Coupon eligible with computed discount', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidateCouponResult' } } } },
            '404': { description: 'Coupon not found or inactive' },
            '409': { description: 'Expired / minimum order / usage cap' },
          },
        },
      },
      '/admin/coupons': {
        get: {
          tags: ['Coupons'],
          summary: 'List coupons',
          security: [{ supabaseAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
            { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          ],
          responses: { '200': { description: 'Paginated coupons', content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponList' } } } } },
        },
        post: {
          tags: ['Coupons'],
          summary: 'Create a coupon (code is uppercased)',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateCouponRequest' } } } },
          responses: { '201': { description: 'Coupon created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Coupon' } } } } },
        },
      },
      '/admin/coupons/{id}': {
        get: {
          tags: ['Coupons'],
          summary: 'Coupon detail',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Coupon', content: { 'application/json': { schema: { $ref: '#/components/schemas/Coupon' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
        patch: {
          tags: ['Coupons'],
          summary: 'Update a coupon',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCouponRequest' } } } },
          responses: { '200': { description: 'Updated coupon', content: { 'application/json': { schema: { $ref: '#/components/schemas/Coupon' } } } }, '404': { $ref: '#/components/responses/NotFound' } },
        },
        delete: {
          tags: ['Coupons'],
          summary: 'Delete a coupon (adds to the redemption ledger of past orders)',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Coupon deleted' }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/banners': {
        get: {
          tags: ['Banners'],
          summary: 'List all active banners (cacheable)',
          responses: { '200': { description: 'Active banners', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/banners/{placement}': {
        get: {
          tags: ['Banners'],
          summary: 'List active banners for a placement',
          parameters: [{ name: 'placement', in: 'path', required: true, schema: { type: 'string', enum: ['HOME_HERO', 'HOME_SECONDARY', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY_TOP', 'PRODUCT_PROMOTION', 'APP_HOME'] } }],
          responses: {
            '200': { description: 'Active banners for placement', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/admin/banners': {
        get: {
          tags: ['Banners'],
          summary: 'List all banners (paginated, filterable)',
          security: [{ supabaseAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'placement', in: 'query', schema: { type: 'string', enum: ['HOME_HERO', 'HOME_SECONDARY', 'HOME_MIDDLE', 'HOME_BOTTOM', 'CATEGORY_TOP', 'PRODUCT_PROMOTION', 'APP_HOME'] } },
            { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Paginated banners', content: { 'application/json': { schema: { $ref: '#/components/schemas/BannerList' } } } } },
        },
        post: {
          tags: ['Banners'],
          summary: 'Create a banner',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBannerRequest' } } } },
          responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Banner' } } } } },
        },
      },
      '/admin/banners/reorder': {
        patch: {
          tags: ['Banners'],
          summary: 'Reorder banners by displayOrder',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderBannersRequest' } } } },
          responses: { '200': { description: 'Updated banner list', content: { 'application/json': { schema: { $ref: '#/components/schemas/BannerList' } } } } },
        },
      },
      '/admin/banners/{id}': {
        get: {
          tags: ['Banners'],
          summary: 'Get a banner',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Banner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Banner' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          tags: ['Banners'],
          summary: 'Update a banner',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateBannerRequest' } } } },
          responses: {
            '200': { description: 'Updated banner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Banner' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Banners'],
          summary: 'Delete a banner',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Deleted' }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/admin/banners/{id}/duplicate': {
        post: {
          tags: ['Banners'],
          summary: 'Duplicate a banner (copy is created inactive)',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '201': { description: 'Duplicated banner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Banner' } } } } },
        },
      },
      '/admin/banners/{id}/activate': {
        patch: {
          tags: ['Banners'],
          summary: 'Activate or deactivate a banner',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ActivateBannerRequest' } } } },
          responses: { '200': { description: 'Updated banner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Banner' } } } } },
        },
      },
      '/homepage': {
        get: {
          tags: ['Homepage'],
          summary: 'Composed public homepage (sections + banners + products)',
          responses: { '200': { description: 'Homepage', content: { 'application/json': { schema: { $ref: '#/components/schemas/Homepage' } } } } },
        },
      },
      '/admin/homepage': {
        get: {
          tags: ['Homepage'],
          summary: 'Get homepage configuration',
          security: [{ supabaseAuth: [] }],
          responses: { '200': { description: 'Homepage config', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
        put: {
          tags: ['Homepage'],
          summary: 'Update homepage configuration',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/HomepageConfig' } } } },
          responses: { '200': { description: 'Homepage config saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/admin/homepage/sections': {
        get: {
          tags: ['Homepage'],
          summary: 'List homepage sections',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'isActive', in: 'query', schema: { type: 'boolean' } }],
          responses: { '200': { description: 'Sections', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
        post: {
          tags: ['Homepage'],
          summary: 'Create a homepage section',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateSectionRequest' } } } },
          responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/HomepageSection' } } } } },
        },
      },
      '/admin/homepage/sections/reorder': {
        patch: {
          tags: ['Homepage'],
          summary: 'Reorder homepage sections by displayOrder',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ReorderSectionsRequest' } } } },
          responses: { '200': { description: 'Updated sections', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/admin/homepage/sections/{id}': {
        patch: {
          tags: ['Homepage'],
          summary: 'Update a homepage section',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSectionRequest' } } } },
          responses: {
            '200': { description: 'Updated section', content: { 'application/json': { schema: { $ref: '#/components/schemas/HomepageSection' } } } },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Homepage'],
          summary: 'Delete a homepage section',
          security: [{ supabaseAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '204': { description: 'Deleted' }, '404': { $ref: '#/components/responses/NotFound' } },
        },
      },
      '/settings/public': {
        get: {
          tags: ['Settings'],
          summary: 'Store settings frontends need (store, delivery, tax, social)',
          responses: { '200': { description: 'Public settings', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/settings/legal': {
        get: {
          tags: ['Settings'],
          summary: 'Legal & safety content (policies + notices)',
          responses: { '200': { description: 'Legal pages', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } } },
        },
      },
      '/admin/settings': {
        get: {
          tags: ['Settings'],
          summary: 'Get all store settings (grouped)',
          security: [{ supabaseAuth: [] }],
          responses: {
            '200': { description: 'All settings', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
        patch: {
          tags: ['Settings'],
          summary: 'Update one or more settings groups',
          security: [{ supabaseAuth: [] }],
          requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateSettingsRequest' } } } },
          responses: {
            '200': { description: 'Updated settings', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '422': { $ref: '#/components/responses/Validation' },
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