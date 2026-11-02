-- Admin notifications/device tokens carry only `adminId`; the customer `userId`
-- column must therefore be nullable (the Prisma schema already declares it as
-- optional, but the original tables were created with NOT NULL).
ALTER TABLE "Notification" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "DeviceToken" ALTER COLUMN "userId" DROP NOT NULL;
