DROP INDEX IF EXISTS "WxUser_unionId_key";

ALTER TABLE "WxUser" RENAME COLUMN "unionId" TO "openId";

CREATE UNIQUE INDEX "WxUser_openId_key" ON "WxUser"("openId");
