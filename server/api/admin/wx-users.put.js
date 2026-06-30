import { createError, readBody } from "h3";
import { cleanText, prisma, requireAdmin } from "../../utils/auth.js";

function tenantIdsFromBody(body) {
  return Array.isArray(body?.tenantIds) ? body.tenantIds.map(cleanText).filter(Boolean) : [];
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const id = cleanText(body?.id);
  const tenantIds = tenantIdsFromBody(body);
  if (!id) {
    throw createError({ statusCode: 400, message: "缺少小程序用户 ID" });
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
