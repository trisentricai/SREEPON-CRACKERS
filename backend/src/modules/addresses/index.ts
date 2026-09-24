import { Router } from 'express';
import { requireFirebase } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { createAddress, deleteAddress, getAddress, listAddresses, setDefaultAddress, updateAddress } from './controller';
import { createAddressSchema, updateAddressSchema } from './schema';

/**
 * Customer shipping addresses. Restricted to authenticated customers and
 * always scoped to the caller's own profile.
 */
export const addressesRouter = Router();

addressesRouter.use('/addresses', requireFirebase());

addressesRouter.get('/addresses', listAddresses);
addressesRouter.post('/addresses', validate({ body: createAddressSchema }), createAddress);
addressesRouter.get('/addresses/:id', getAddress);
addressesRouter.patch('/addresses/:id', validate({ body: updateAddressSchema }), updateAddress);
addressesRouter.delete('/addresses/:id', deleteAddress);
addressesRouter.patch('/addresses/:id/default', setDefaultAddress);