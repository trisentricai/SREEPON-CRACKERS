import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { checkoutLimiter } from '../../utils/rate-limit';
import * as controller from './controller';
import { createPaymentSchema } from './schema';

/**
 * Pay for an order. `POST /payments` creates a backend-priced intent on the
 * chosen gateway; only a provider webhook (signature-verified) can mark it
 * paid. The provider list comes from the gateway adapters.
 */
export const paymentsRouter = Router();

paymentsRouter.post(
  '/payments',
  requireFirebase(),
  checkoutLimiter(),
  validate({ body: createPaymentSchema }),
  controller.createPayment,
);
paymentsRouter.get('/payments/:id', requireFirebase(), controller.getPaymentStatus);

// Provider webhooks — verified by gateway signature, NOT by bearer token.
paymentsRouter.post('/payments/webhooks/:provider', controller.handleWebhook);