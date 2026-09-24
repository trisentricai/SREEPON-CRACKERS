import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { requireSupabase, requireAdminRoles, AdminRole } from '../../middleware/auth.middleware';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { ApiError, HttpStatus, asyncHandler, ok, routeParam } from '../../utils/http';
import { prisma } from '../../infrastructure/prisma';
import { UserStatus } from '../../types/enums';

const userStatusValues = Object.values(UserStatus) as [UserStatus, ...UserStatus[]];

const listCustomersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().trim().max(120).optional(),
    status: z.enum(userStatusValues).optional(),
    isActive: z
      .string()
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
  })
  .transform((value) => {
    const { isActive, ...rest } = value;
    return { ...rest, isActive };
  });

type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;

const customerDetailParamsSchema = z.object({
  id: z.string().uuid(),
});

const customerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

type CustomerOrdersQuery = z.infer<typeof customerOrdersQuerySchema>;

function moneyString(value: { toNumber(): number } | number | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  return (typeof value === 'number' ? value : value.toNumber()).toFixed(2);
}

const customerDetailSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const adminCustomersRouter = Router();

adminCustomersRouter.use(
  '/admin/customers',
  requireSupabase(),
  requireAdminRoles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.ORDER_MANAGER),
);

adminCustomersRouter.get('/admin/customers', asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListCustomersQuery>(req);
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q, mode: 'insensitive' as const } },
            { name: { contains: query.q, mode: 'insensitive' as const } },
            { phone: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        ...customerDetailSelect,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  const items = customers.map((customer) => ({
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    status: customer.status,
    isActive: customer.isActive,
    orderCount: customer._count.orders,
    createdAt: customer.createdAt,
  }));

  res.json(
    ok(
      {
        items,
        pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      },
      `${total} customer(s)`,
    ),
  );
}));

adminCustomersRouter.get('/admin/customers/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = routeParam(req, 'id');
  customerDetailParamsSchema.parse({ id });

  const customer = await prisma.user.findUnique({
    where: { id },
    select: {
      ...customerDetailSelect,
      _count: { select: { orders: true, addresses: true } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, grandTotal: true, createdAt: true },
      },
    },
  });

  if (!customer) throw ApiError.notFound('Customer not found');

  res.json(
    ok({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      status: customer.status,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      stats: {
        orderCount: customer._count.orders,
        addressCount: customer._count.addresses,
      },
      recentOrders: customer.orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        grandTotal: moneyString(order.grandTotal),
        createdAt: order.createdAt,
      })),
    }),
  );
}));

adminCustomersRouter.get('/admin/customers/:id/orders', asyncHandler(async (req: Request, res: Response) => {
  const id = routeParam(req, 'id');
  customerDetailParamsSchema.parse({ id });
  const query = getValidatedQuery<CustomerOrdersQuery>(req);

  const [customer, total, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } }),
    prisma.order.count({ where: { userId: id } }),
    prisma.order.findMany({
      where: { userId: id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        currency: true,
        grandTotal: true,
        items: {
          select: { id: true, productId: true, productName: true, sku: true, quantity: true, unitPrice: true, lineTotal: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  if (!customer) throw ApiError.notFound('Customer not found');

  res.json(
    ok({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        grandTotal: moneyString(order.grandTotal),
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: order.createdAt,
      })),
      pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
    },
    `${total} order(s) for this customer`,
  ),
);
}));
