import { createError, readBody } from "h3";
import { cleanText, hashPassword, isAdminRole, prisma, requireAdmin } from "../../../utils/auth.js";

function normalizeRole(role) {
  return role === "ADMIN" ? "ADMIN" : "STAFF";
}

function tenantIdsFromBody(body) {
  return Array.isArray(body?.tenantIds) ? body.tenantIds.map(cleanText).filter(Boolean) : [];
}

export default defineEventHandler(async (event) => {
  const currentUser = await requireAdmin(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const account = cleanText(body?.account);
  const name = cleanText(body?.name) || account;
  const role = normalizeRole(body?.role);
  const tenantIds = tenantIdsFromBody(body);
  const password = cleanText(body?.password);

  if (!account || !name) {
    throw createError({ statusCode: 400, message: "请填写账号和姓名" });
  }
  if (role === "STAFF" && tenantIds.length === 0) {
    throw createError({ statusCode: 400, message: "员工至少需要分配一家门店" });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw createError({ statusCode: 404, message: "账号不存在" });
  }

  if (isAdminRole(existing.role) && role === "STAFF") {
    const adminCount = await prisma.user.count({ where: { role: { in: ["ADMIN", "OWNER"] } } });
    if (adminCount <= 1) {
      throw createError({ statusCode: 400, message: "至少需要保留一个管理员" });
    }
  }

  const passwordData = password ? hashPassword(password) : {};
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        account,
        name,
        mobile: cleanText(body?.mobile),
        email: cleanText(body?.email),
        role,
        ...passwordData,
      },
    });
    await tx.userTenant.deleteMany({ where: { userId: id } });
    if (tenantIds.length) {
      await tx.userTenant.createMany({
        data: tenantIds.map((tenantId) => ({ userId: id, tenantId })),
        skipDuplicates: true,
      });
    }
    if (currentUser.id === id && role === "STAFF") {
      await tx.session.deleteMany({ where: { userId: id } });
    }
    return updated;
  });

  return { user };
});
