export async function resolveTenant(prisma, tenantCode) {
  return prisma.tenant.upsert({
    where: { code: tenantCode },
    update: {},
    create: {
      code: tenantCode,
      name: tenantCode === "main" ? "默认门店" : tenantCode,
    },
  });
}
