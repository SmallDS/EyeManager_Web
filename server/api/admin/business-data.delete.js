import { createError, readBody } from "h3";
import { clearBusinessData } from "~~/src/lib/importService.js";
import { getTenant, prisma, requireAdmin } from "../../utils/auth.js";

const CONFIRMATION_TEXT = "清空数据";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const tenant = await getTenant(event);
  const body = await readBody(event);

  const runningCount = await prisma.importBatch.count({
    where: { tenantId: tenant.id, status: "RUNNING" },
  });
  if (runningCount > 0) {
    throw createError({ statusCode: 409, message: "当前门店已有导入任务运行中，请完成后再清空数据" });
  }

  if (body?.confirmation !== CONFIRMATION_TEXT) {
    throw createError({ statusCode: 400, message: `请输入确认词：${CONFIRMATION_TEXT}` });
  }

  const result = await clearBusinessData(prisma, tenant);

  return { tenant, result };
});
