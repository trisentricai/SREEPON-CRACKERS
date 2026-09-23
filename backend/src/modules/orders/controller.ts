import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import type { AdminListOrdersQuery, PaginationQuery } from './schema';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

function requestId(req: Request): string | undefined {
  return req.get('x-request-id') ?? undefined;
}

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.createOrder(await resolveUserId(req), req.body);
  res.status(HttpStatus.CREATED).json(ok(order, `Order ${order.orderNumber} created`));
});

export const listMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<PaginationQuery>(req);
  const result = await service.listMyOrders(await resolveUserId(req), query);
  res.json(ok(result, `${result.pagination.total} order(s)`));
});

export const getMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.getMyOrder(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(order));
});

export const cancelMyOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.cancelOrder(await resolveUserId(req), routeParam(req, 'id'), req.body);
  res.json(ok(order, 'Order cancelled'));
});

export const requestReturn = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.requestReturn(await resolveUserId(req), routeParam(req, 'id'), req.body);
  res.json(ok(order, 'Return requested'));
});

export const getMyInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await service.getInvoiceForUser(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(invoice));
});

export const adminListOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<AdminListOrdersQuery>(req);
  const result = await service.listOrders(query);
  res.json(ok(result, `${result.pagination.total} order(s)`));
});

export const adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.getOrderForAdmin(routeParam(req, 'id'));
  res.json(ok(order));
});

export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.updateOrderStatus(
    req.admin?.sub ?? null,
    routeParam(req, 'id'),
    req.body,
    requestId(req),
  );
  res.json(ok(order, 'Order status updated'));
});

export const adminUpdatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.updateOrderPaymentStatus(
    req.admin?.sub ?? null,
    routeParam(req, 'id'),
    req.body,
    requestId(req),
  );
  res.json(ok(order, 'Payment status updated'));
});

export const adminAddNote = asyncHandler(async (req: Request, res: Response) => {
  const order = await service.addOrderNote(req.admin?.sub ?? null, routeParam(req, 'id'), req.body);
  res.json(ok(order, 'Note added'));
});

export const adminGetInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await service.getInvoiceForAdmin(routeParam(req, 'id'));
  res.json(ok(invoice));
});