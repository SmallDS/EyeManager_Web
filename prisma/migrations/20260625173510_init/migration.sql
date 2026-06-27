-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportIssueLevel" AS ENUM ('WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceCustomerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "pinyin" TEXT,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "note" TEXT,
    "sourceCreatedAt" TIMESTAMP(3),
    "rawRow" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptometryExam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sourceCustomerId" TEXT NOT NULL,
    "examAt" TIMESTAMP(3) NOT NULL,
    "distanceRight" JSONB NOT NULL,
    "distanceLeft" JSONB NOT NULL,
    "nearRight" JSONB NOT NULL,
    "nearLeft" JSONB NOT NULL,
    "pupil" JSONB NOT NULL,
    "comment" TEXT,
    "rawRow" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptometryExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'RUNNING',
    "customerFile" TEXT NOT NULL,
    "optometryFile" TEXT NOT NULL,
    "customerRows" INTEGER NOT NULL DEFAULT 0,
    "importedCustomers" INTEGER NOT NULL DEFAULT 0,
    "optometryRows" INTEGER NOT NULL DEFAULT 0,
    "importedOptometry" INTEGER NOT NULL DEFAULT 0,
    "skippedOptometry" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportIssue" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "level" "ImportIssueLevel" NOT NULL,
    "entity" TEXT NOT NULL,
    "sourceId" TEXT,
    "rowNumber" INTEGER,
    "message" TEXT NOT NULL,
    "rawRow" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Customer_tenantId_primaryPhone_idx" ON "Customer"("tenantId", "primaryPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_sourceCustomerId_key" ON "Customer"("tenantId", "sourceCustomerId");

-- CreateIndex
CREATE INDEX "OptometryExam_tenantId_examAt_idx" ON "OptometryExam"("tenantId", "examAt");

-- CreateIndex
CREATE INDEX "OptometryExam_customerId_examAt_idx" ON "OptometryExam"("customerId", "examAt");

-- CreateIndex
CREATE UNIQUE INDEX "OptometryExam_tenantId_sourceCustomerId_examAt_key" ON "OptometryExam"("tenantId", "sourceCustomerId", "examAt");

-- CreateIndex
CREATE INDEX "ImportBatch_tenantId_startedAt_idx" ON "ImportBatch"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "ImportIssue_batchId_level_idx" ON "ImportIssue"("batchId", "level");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptometryExam" ADD CONSTRAINT "OptometryExam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptometryExam" ADD CONSTRAINT "OptometryExam_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportIssue" ADD CONSTRAINT "ImportIssue_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
