import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import { pending } from '../helpers';

/**
 * Provider-independent payment architecture.
 * PHASE 7 implements the real controllers: payment intent creation, provider
 * adapters, webhook verification (signature checked server-side), refunds.
 */
export const paymentsRouter = Router();

paymentsRouter.post('/payments', requireFirebase(), checkoutLimiter(), pending('create payment'));
paymentsRouter.get('/payments/:id', requireFirebase(), pending('get payment status'));

// Provider webhooks — verified by signature, NOT by bearer token; never mark an
// order paid on the frontend's word alone.
paymentsRouter.post('/payments/webhooks/:provider', pending('payment webhook'));