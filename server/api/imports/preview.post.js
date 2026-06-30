import { createError, readMultipartFormData } from "h3";
import { previewCsvImportFromText } from "~~/src/lib/importService.js";
import { getTenant, prisma, requireAdmin } from "../../utils/auth.js";

function getPart(parts, name) {
  return parts.find((part) => part.name === name);
}

function getFilePart(parts, name, label) {
  const part = getPart(parts, name);
  if (!part?.filename || !part?.data?.length) {
    throw createError({ statusCode: 400, message: `请上传${label}` });
  }
  return part;
}

async function ensureNoRunningImport(tenant) {
  const runningCount = await prisma.importBatch.count({
    where: { tenantId: tenant.id, status: "RUNNING" },
  });
  if (runningCount > 0) {
    throw createError({ statusCode: 409, message: "当前门店已有导入任务运行中，请完成后再操作" });
  }
}

function toBadRequest(error) {
  if (error?.statusCode === 400) {
    return createError({ statusCode: 400, message: error.message });
  }
  return error;
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const tenant = await getTenant(event);
  const parts = await readMultipartFormData(event);

  if (!parts?.length) {
    throw createError({ statusCode: 400, message: "请通过表单上传顾客 CSV 和验光 CSV" });
  }

  await ensureNoRunningImport(tenant);

  const customerFile = getFilePart(parts, "customerFile", "顾客 CSV");
  const optometryFile = getFilePart(parts, "optometryFile", "验光 CSV");

  try {
    const preview = previewCsvImportFromText(
      new TextDecoder("utf-8").decode(customerFile.data),
      new TextDecoder("utf-8").decode(optometryFile.data),
    );
    return {
      tenant,
      files: {
        customerFile: customerFile.filename,
        optometryFile: optometryFile.filename,
      },
      preview,
    };
  } catch (error) {
    throw toBadRequest(error);
  }
});
