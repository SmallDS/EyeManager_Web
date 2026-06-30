import { prisma, requireAdmin } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const [wxUsers, tenants] = await Promise.all([
    prisma.wxUser.findMany({
      orderBy: { lastSeenAt: "desc" },
      include: {
        wxUserTenants: {
          include: { tenant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.tenant.findMany({ orderBy: [{ createdAt: "asc" }, { name: "asc" }] }),
  ]);

  return { wxUsers, tenants };
});
