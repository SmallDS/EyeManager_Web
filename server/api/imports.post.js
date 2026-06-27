import { createError, readMultipartFormData, setResponseStatus } from "h3";
import { clearBusinessData, startCsvImportFromTexts } from "~~/src/lib/importService.js";
import { assertAdminApiKey, getTenant, prisma } from "../utils/tenant.js";

const CONFIRMATION_TEXT = "清空数据";

function getPart(parts, name) {
  return parts.find((part) => part.name === name);
}

function getTextPart(parts, name) {
  const part = getPart(parts, name);
  return part?.data ? new TextDecoder("utf-8").decode(part.data).trim() : "";
}

function getFilePart(parts, name, label) {
  const part = getPart(parts, name);
  if (!part?.filename || !part?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: `请上传${label}` });
  }
  return part;
}

export default defineEventHandler(async (event) => {
  assertAdminApiKey(event);

  const tenant = await getTenant(event);
  const parts = await readMultipartFormData(event);

  if (!parts?.length) {
    throw createError({ statusCode: 400, statusMessage: "请通过表单上传顾客 CSV 和验光 CSV" });
  }

  const customerFile = getFilePart(parts, "customerFile", "顾客 CSV");
  const optometryFile = getFilePart(parts, "optometryFile", "验光 CSV");
  const clearBeforeImport = getTextPart(parts, "clearBeforeImport") === "true";

  if (clearBeforeImport) {
    const confirmation = getTextPart(parts, "confirmation");
    if (confirmation !== CONFIRMATION_TEXT) {
      throw createError({ statusCode: 400, statusMessage: `请输入确认词：${CONFIRMATION_TEXT}` });
    }
    await clearBusinessData(prisma, tenant);
  }

  const batch = await startCsvImportFromTexts(
    prisma,
    tenant,
    new TextDecoder("utf-8").decode(customerFile.data),
    new TextDecoder("utf-8").decode(optometryFile.data),
    {
      customerFile: customerFile.filename,
      optometryFile: optometryFile.filename,
    },
  );

  setResponseStatus(event, 202);
  return { tenant, batch, message: "导入任务已开始，请稍后刷新查看进度" };
});
