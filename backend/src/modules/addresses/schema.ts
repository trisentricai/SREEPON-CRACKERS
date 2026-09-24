import { z } from 'zod';

const addressFields = {
  label: z.string().trim().min(1, 'Label is required').max(40).default('Home'),
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  phone: z.string().trim().min(1, 'Phone is required').max(30),
  line1: z.string().trim().min(1, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State is required').max(100),
  pincode: z.string().trim().regex(/^[0-9]{4,10}$/, 'Pincode must be 4–10 digits').max(10),
  country: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()).default('IN'),
  isDefault: z.boolean().optional(),
} as const;

export const createAddressSchema = z.object(addressFields);

export const updateAddressSchema = z
  .object({
    label: addressFields.label.optional(),
    fullName: addressFields.fullName.optional(),
    phone: addressFields.phone.optional(),
    line1: addressFields.line1.optional(),
    line2: addressFields.line2.optional(),
    city: addressFields.city.optional(),
    state: addressFields.state.optional(),
    pincode: addressFields.pincode.optional(),
    country: addressFields.country.optional(),
    isDefault: addressFields.isDefault.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;