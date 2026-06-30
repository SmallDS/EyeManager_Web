import { requireAdmin, prisma } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const tenants = await prisma.tenant.findMany({
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          customers: true,
          optometryExams: true,
          importBatches: true,
          userTenants: true,
          wxUserTenants: true,
        },
      },
    },
  });
  return { tenants };
});
