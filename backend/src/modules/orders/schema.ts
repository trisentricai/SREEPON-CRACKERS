import { z } from 'zod';
import {
  OrderStatus as OrderStatusEnum,
  PaymentStatus as PaymentStatusEnum,
  type OrderStatus,
  type PaymentStatus,
} from '../../types/enums';

const orderStatusValues = Object.values(OrderStatusEnum) as [OrderStatus, ...OrderStatus[]];
const paymentStatusValues = Object.values(PaymentStatusEnum) as [PaymentStatus, ...PaymentStatus[]];

const addressDeliverySchema = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().regex(/^[0-9+\-\s]{8,15}$/, 'Invalid phone number'),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^[0-9]{5,10}$/, 'Invalid pincode'),
  country: z.string().trim().min(2).max(60).default('IN'),
});

export const createOrderSchema = z
  .object({
    address: addressDeliverySchema.optional(),
    addressId: z.string().uuid().optional(),
    couponCode: z.string().trim().toUpperCase().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.address && !value.addressId) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Provide either an address object or an addressId',
      });
    }
  });

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export const returnRequestSchema = z.object({
  productId: z.string().uuid().optional(),
  reason: z.string().trim().min(1).max(500),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(orderStatusValues),
  reason: z.string().trim().max(300).optional(),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(paymentStatusValues),
});

export const addAdminNoteSchema = z.object({
  note: z.string().trim().min(1).max(1000),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminListOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(orderStatusValues).optional(),
  paymentStatus: z.enum(paymentStatusValues).optional(),
  q: z.string().trim().max(120).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ReturnRequestInput = z.infer<typeof returnRequestSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type AddAdminNoteInput = z.infer<typeof addAdminNoteSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;