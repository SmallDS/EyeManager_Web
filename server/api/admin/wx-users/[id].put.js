import { createError, readBody } from "h3";
import { cleanText, prisma, requireAdmin } from "../../../utils/auth.js";

function tenantIdsFromBody(body) {
  return Array.isArray(body?.tenantIds) ? body.tenantIds.map(cleanText).filter(Boolean) : [];
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const tenantIds = tenantIdsFromBody(body);

  const existing = await prisma.wxUser.findUnique({ where: { id } });
  if (!existing) {
    throw createError({ statusCode: 404, message: "小程序用户不存在" });
  }

  const wxUser = await prisma.$transaction(async (tx) => {
    await tx.wxUserTenant.deleteMany({ where: { wxUserId: id } });
    if (tenantIds.length) {
      await tx.wxUserTenant.createMany({
        data: tenantIds.map((tenantId) => ({ wxUserId: id, tenantId })),
        skipDuplicates: true,
      });
    }
    return tx.wxUser.findUnique({ where: { id } });
  });

  return { wxUser };
});
