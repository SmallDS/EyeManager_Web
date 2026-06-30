import { createError, readBody } from "h3";
import { cleanText, prisma, requireAdmin } from "../../utils/auth.js";

function cleanCode(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const name = cleanText(body?.name);
  const code = cleanCode(body?.code);

  if (!name || !code) {
    throw createError({ statusCode: 400, message: "请填写门店名称和编码" });
  }

  const tenant = await prisma.tenant.create({
    data: { name, code },
  });

  return { tenant };
});
