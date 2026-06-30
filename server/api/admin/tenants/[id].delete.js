import { createError } from "h3";
import { prisma, requireAdmin } from "../../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id");
  const tenant = await prisma.tenant.findUnique({
    where: { id },
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

  if (!tenant) {
    throw createError({ statusCode: 404, message: "门店不存在" });
  }

  const hasRelations = Object.values(tenant._count).some((count) => count > 0);
  if (hasRelations) {
    throw createError({ statusCode: 400, message: "该门店仍有关联数据或分配关系，不能删除" });
  }

  await prisma.tenant.delete({ where: { id } });
  return { ok: true };
});
