-- Convert backend users from single-tenant records to global login accounts.
ALTER TABLE "User" ADD COLUMN "account" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordSalt" TEXT;

UPDATE "User"
SET
  "account" = COALESCE(NULLIF("email", ''), NULLIF("mobile", ''), 'user-' || substr("id", 1, 8)),
  "passwordSalt" = 'legacy'
WHERE "account" IS NULL;

UPDATE "User"
SET "passwordHash" = COALESCE("passwordHash", '')
WHERE "passwordHash" IS NULL;

ALTER TABLE "User" ALTER COLUMN "account" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "passwordSalt" SET NOT NULL;

CREATE UNIQUE INDEX "User_account_key" ON "User"("account");

CREATE TABLE "UserTenant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "UserTenant" ("id", "userId", "tenantId")
SELECT 'ut-' || substr(md5("id" || "tenantId"), 1, 24), "id", "tenantId"
FROM "User"
WHERE "tenantId" IS NOT NULL;

CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "WxUser" (
  "id" TEXT NOT NULL,
  "unionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WxUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WxUser_unionId_key" ON "WxUser"("unionId");

CREATE TABLE "WxUserTenant" (
  "id" TEXT NOT NULL,
  "wxUserId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WxUserTenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WxUserTenant_wxUserId_tenantId_key" ON "WxUserTenant"("wxUserId", "tenantId");
CREATE INDEX "WxUserTenant_tenantId_idx" ON "WxUserTenant"("tenantId");

CREATE TABLE "WxSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "wxUserId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WxSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WxSession_tokenHash_key" ON "WxSession"("tokenHash");
CREATE INDEX "WxSession_wxUserId_idx" ON "WxSession"("wxUserId");
CREATE INDEX "WxSession_expiresAt_idx" ON "WxSession"("expiresAt");

CREATE TABLE "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WxUserTenant" ADD CONSTRAINT "WxUserTenant_wxUserId_fkey" FOREIGN KEY ("wxUserId") REFERENCES "WxUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WxUserTenant" ADD CONSTRAINT "WxUserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WxSession" ADD CONSTRAINT "WxSession_wxUserId_fkey" FOREIGN KEY ("wxUserId") REFERENCES "WxUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";
DROP INDEX "User_tenantId_idx";
ALTER TABLE "User" DROP COLUMN "tenantId";
