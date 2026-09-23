import type { Request, Response } from 'express';
import { ApiError, asyncHandler, HttpStatus, ok, routeParam } from '../../utils/http';
import { getProfileByUid } from '../auth/service';
import * as service from './service';

function resolveUserId(req: Request): Promise<string> {
  return getProfileByUid(req.user!.uid).then((user) => user.id);
}

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await service.createPayment(await resolveUserId(req), req.body);
  res.status(HttpStatus.CREATED).json(ok(payment, 'Payment initiated'));
});

export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const payment = await service.getPayment(await resolveUserId(req), routeParam(req, 'id'));
  res.json(ok(payment));
});

/**
 * Provider webhook — verified by gateway signature, not by a bearer token.
 * The route relies on the global JSON body parser whose `verify` callback keeps
 * the raw bytes on `req.rawBody` for signature checks.
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    throw ApiError.badRequest('Webhook requires a JSON body');
  }
  const payment = await service.handleWebhook(routeParam(req, 'provider'), rawBody, req.headers);
  res.json(ok(payment, 'Webhook processed'));
});