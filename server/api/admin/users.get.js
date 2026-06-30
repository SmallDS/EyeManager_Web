import { prisma, requireAdmin } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const [users, tenants] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        account: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        userTenants: {
          include: { tenant: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.tenant.findMany({ orderBy: [{ createdAt: "asc" }, { name: "asc" }] }),
  ]);

  return { users, tenants };
});
