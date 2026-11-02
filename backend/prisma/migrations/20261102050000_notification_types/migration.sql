-- Add notification types used by order e-mail/SMS/in-app notifications.
-- PostgreSQL >= 12 allows ADD VALUE inside a transaction as long as the new
-- value is not referenced by the same transaction.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_STATUS_CHANGED';
