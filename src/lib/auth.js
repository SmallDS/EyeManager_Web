export function getTenantCode(request) {
  const url = new URL(request.url);
  return request.headers.get("x-tenant-code") || url.searchParams.get("tenant") || "main";
}

export function assertApiKey(request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    return null;
  }
  const providedKey = request.headers.get("x-api-key");
  if (providedKey !== configuredKey) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }
  return null;
}

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
