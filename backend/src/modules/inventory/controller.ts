import type { Request, Response } from 'express';
import { getValidatedQuery } from '../../middleware/validation.middleware';
import { asyncHandler, ok, routeParam } from '../../utils/http';
import type { AdjustStockInput, ListInventoryQuery, TransactionsQuery } from './schema';
import * as service from './service';

function adminActor(req: Request): string | null {
  return req.admin?.sub ?? null;
}

function requestId(req: Request): string | undefined {
  return req.get('x-request-id') ?? undefined;
}

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<ListInventoryQuery>(req);
  const result = await service.listInventory(query);
  res.json(ok(result, `${result.pagination.total} inventory item(s)`));
});

export const listLowStock = asyncHandler(async (_req: Request, res: Response) => {
  const items = await service.listLowStock();
  res.json(ok({ items }, `${items.length} low-stock item(s)`));
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.adjustStock(
    adminActor(req),
    routeParam(req, 'productId'),
    req.body as AdjustStockInput,
    requestId(req),
  );
  res.json(ok(item, 'Stock adjusted'));
});

export const listProductTransactions = asyncHandler(async (req: Request, res: Response) => {
  const query = getValidatedQuery<TransactionsQuery>(req);
  const result = await service.listTransactions(routeParam(req, 'productId'), query);
  res.json(ok(result, `${result.pagination.total} transaction(s)`));
});