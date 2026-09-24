import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';
import type { Address } from '@prisma/client';
import type { CreateAddressInput, UpdateAddressInput } from './schema';

const addressSelect = {
  id: true,
  label: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  state: true,
  pincode: true,
  country: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AddressView = Pick<
  Address,
  | 'id'
  | 'label'
  | 'fullName'
  | 'phone'
  | 'line1'
  | 'line2'
  | 'city'
  | 'state'
  | 'pincode'
  | 'country'
  | 'isDefault'
  | 'createdAt'
  | 'updatedAt'
>;

/** Every stored address belongs to exactly one user; ownership is always scoped. */
async function findOwnedAddress(userId: string, id: string): Promise<AddressView> {
  const address = await prisma.address.findFirst({ where: { id, userId }, select: addressSelect });
  if (!address) throw ApiError.notFound('Address not found');
  return address;
}

export async function listAddresses(userId: string): Promise<AddressView[]> {
  return prisma.address.findMany({
    where: { userId },
    select: addressSelect,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createAddress(userId: string, input: CreateAddressInput): Promise<AddressView> {
  const count = await prisma.address.count({ where: { userId } });
  const first = count === 0; // the first saved address becomes the default.

  const isDefault = input.isDefault ?? first;

  if (isDefault) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  return prisma.address.create({
    data: {
      userId,
      label: input.label,
      fullName: input.fullName,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      country: input.country,
      isDefault,
    },
    select: addressSelect,
  });
}

export async function getAddress(userId: string, id: string): Promise<AddressView> {
  return findOwnedAddress(userId, id);
}

export async function updateAddress(
  userId: string,
  id: string,
  input: UpdateAddressInput,
): Promise<AddressView> {
  await findOwnedAddress(userId, id);

  if (input.isDefault === true) {
    await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
  }

  return prisma.address.update({
    where: { id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
      ...(input.line2 !== undefined ? { line2: input.line2 } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.state !== undefined ? { state: input.state } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    },
    select: addressSelect,
  });
}

/** Set one address as the default; any previously-default address is demoted. */
export async function setDefaultAddress(userId: string, id: string): Promise<AddressView> {
  await findOwnedAddress(userId, id);
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return findOwnedAddress(userId, id);
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  await findOwnedAddress(userId, id);
  await prisma.address.delete({ where: { id } });
}