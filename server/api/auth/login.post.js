import { createError, readBody } from "h3";
import { cleanText, createWebSession, ensureBootstrapAdmin, prisma, verifyPassword } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  await ensureBootstrapAdmin();
  const body = await readBody(event);
  const account = cleanText(body?.account);
  const password = cleanText(body?.password);

  if (!account || !password) {
    throw createError({ statusCode: 400, message: "请输入账号和密码" });
  }

  const user = await prisma.user.findUnique({ where: { account } });
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    throw createError({ statusCode: 401, message: "账号或密码错误" });
  }

  await createWebSession(event, user.id);
  return { ok: true };
});
