import { createError, readBody } from "h3";
import { cleanText, hashPassword, prisma, requireAdmin } from "../../utils/auth.js";

function normalizeRole(role) {
  return role === "ADMIN" ? "ADMIN" : "STAFF";
}

function tenantIdsFromBody(body) {
  return Array.isArray(body?.tenantIds) ? body.tenantIds.map(cleanText).filter(Boolean) : [];
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const account = cleanText(body?.account);
  const name = cleanText(body?.name) || account;
  const password = cleanText(body?.password);
  const role = normalizeRole(body?.role);
  const tenantIds = tenantIdsFromBody(body);

  if (!account || !password) {
    throw createError({ statusCode: 400, message: "请填写账号和密码" });
  }
  if (role === "STAFF" && tenantIds.length === 0) {
    throw createError({ statusCode: 400, message: "员工至少需要分配一家门店" });
  }

  const { passwordHash, passwordSalt } = hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        account,
        name,
        mobile: cleanText(body?.mobile),
        email: cleanText(body?.email),
        role,
        passwordHash,
        passwordSalt,
      },
    });
    if (tenantIds.length) {
      await tx.userTenant.createMany({
        data: tenantIds.map((tenantId) => ({ userId: created.id, tenantId })),
        skipDuplicates: true,
      });
    }
    return created;
  });

  return { user };
});
