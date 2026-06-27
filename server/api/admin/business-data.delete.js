import { createError, readBody } from "h3";
import { clearBusinessData } from "~~/src/lib/importService.js";
import { getTenant, prisma } from "../../utils/tenant.js";

const CONFIRMATION_TEXT = "清空数据";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const body = await readBody(event);

  if (body?.confirmation !== CONFIRMATION_TEXT) {
    throw createError({ statusCode: 400, statusMessage: `请输入确认词：${CONFIRMATION_TEXT}` });
  }

  const result = await clearBusinessData(prisma, tenant);

  return { tenant, result };
});
