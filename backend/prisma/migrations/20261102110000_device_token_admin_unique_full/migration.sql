-- The admin device-token index was created as a PARTIAL unique index
-- (WHERE "adminId" IS NOT NULL). Postgres cannot use a partial index to infer
-- an ON CONFLICT target, so Prisma's `deviceToken.upsert()` on
-- (adminId, token) failed with 42P10 and device registration returned 500.
--
-- A full unique index keeps the same semantics for nullable adminId (NULLs are
-- never considered equal, so customer-only rows are unaffected) and is
-- inferable by ON CONFLICT.
DROP INDEX IF EXISTS "DeviceToken_adminId_token_key";
CREATE UNIQUE INDEX "DeviceToken_adminId_token_key" ON "DeviceToken"("adminId", "token");
