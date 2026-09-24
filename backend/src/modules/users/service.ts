import { prisma } from '../../infrastructure/prisma';
import { getProfileByUid, toPublicProfile } from '../auth/service';
import { listMyOrders as listCustomerOrders } from '../orders/service';
import { paginationQuerySchema } from '../orders/schema';
import type { UpdateProfileInput } from './schema';
import type { z } from 'zod';

type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Current customer profile. Unknown local profile 401s so clients re-sign-in. */
export async function getProfile(uid: string) {
  return getProfileByUid(uid);
}

/** Update editable profile fields. The Firebase identity stays authoritative. */
export async function updateProfile(uid: string, input: UpdateProfileInput) {
  const current = await getProfileByUid(uid);
  const user = await prisma.user.update({
    where: { id: current.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
  });
  return toPublicProfile(user);
}

/** The customer's own order history, paginated identically to /orders. */
export async function getMyOrders(uid: string, query: PaginationQuery) {
  const profile = await getProfileByUid(uid);
  return listCustomerOrders(profile.id, query);
}