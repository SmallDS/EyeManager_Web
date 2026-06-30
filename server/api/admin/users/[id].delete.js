import { createError } from "h3";
import { isAdminRole, prisma, requireAdmin } from "../../../utils/auth.js";

export default defineEventHandler(async (event) => {
  const currentUser = await requireAdmin(event);
  const id = getRouterParam(event, "id");
  if (currentUser.id === id) {
    throw createError({ statusCode: 400, message: "不能删除当前登录账号" });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw createError({ statusCode: 404, message: "账号不存在" });
  }

  if (isAdminRole(user.role)) {
    const adminCount = await prisma.user.count({ where: { role: { in: ["ADMIN", "OWNER"] } } });
    if (adminCount <= 1) {
      throw createError({ statusCode: 400, message: "至少需要保留一个管理员" });
    }
  }

  await prisma.user.delete({ where: { id } });
  return { ok: true };
});
