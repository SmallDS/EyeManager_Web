import { createError, getHeader, getQuery } from "h3";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function getTenantCode(event) {
  const query = getQuery(event);
  return getHeader(event, "x-tenant-code") || query.tenant || "main";
}

export async function getTenant(event) {
  return resolveTenant(prisma, getTenantCode(event));
}

export async function resolveTenant(prismaClient, tenantCode) {
  return prismaClient.tenant.upsert({
    where: { code: tenantCode },
    update: {},
    create: {
      code: tenantCode,
      name: tenantCode === "main" ? "默认门店" : tenantCode,
    },
  });
}

export function assertAdminApiKey(event) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) return;

  const providedKey = getHeader(event, "x-api-key");
  if (providedKey !== configuredKey) {
    throw createError({ statusCode: 401, statusMessage: "未授权" });
  }
}

export function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
