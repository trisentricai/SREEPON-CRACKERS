-- AlterTable
-- Add optional adminId to Notification and DeviceToken so admin push
-- notifications and device registration can reuse the existing tables.
ALTER TABLE "Notification" ADD COLUMN "adminId" TEXT;
ALTER TABLE "DeviceToken" ADD COLUMN "adminId" TEXT;

-- Unique constraint for admin device tokens (one row per admin+token).
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_adminId_token_key" ON "DeviceToken"("adminId", "token") WHERE "adminId" IS NOT NULL;

-- Indexes for admin notification queries.
CREATE INDEX IF NOT EXISTS "Notification_adminId_isRead_idx" ON "Notification"("adminId", "isRead") WHERE "adminId" IS NOT NULL;
