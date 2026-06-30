import { readFile } from "node:fs/promises";
import { parseCsvDocument } from "./csv.mjs";
import { summarizeImport } from "./importRules.mjs";

const REQUIRED_CUSTOMER_HEADERS = ["c_id", "c_name", "dt_dt"];
const REQUIRED_OPTOMETRY_HEADERS = ["c_id", "dt_dt"];
const PREVIEW_ISSUE_LIMIT = 20;

export class CsvImportValidationError extends Error {
  constructor(messages) {
    super(messages.join("；"));
    this.name = "CsvImportValidationError";
    this.statusCode = 400;
    this.statusMessage = this.message;
    this.messages = messages;
  }
}

export async function loadCsvImport(customerFile, optometryFile) {
  const [customerText, optometryText] = await Promise.all([
    readFile(customerFile, "utf8"),
    readFile(optometryFile, "utf8"),
  ]);
  return loadCsvImportFromText(customerText, optometryText);
}

export function loadCsvImportFromText(customerText, optometryText) {
  const customerDocument = parseCsvDocument(customerText);
  const optometryDocument = parseCsvDocument(optometryText);
  validateCsvHeaders(customerDocument.headers, REQUIRED_CUSTOMER_HEADERS, "顾客 CSV");
  validateCsvHeaders(optometryDocument.headers, REQUIRED_OPTOMETRY_HEADERS, "验光 CSV");
  return summarizeImport(customerDocument.records, optometryDocument.records);
}

export function previewCsvImportFromText(customerText, optometryText) {
  return buildImportPreview(loadCsvImportFromText(customerText, optometryText));
}

export function buildImportPreview(summary) {
  const issues = [...summary.customerIssues, ...summary.optometryIssues];
  return {
    customerRows: summary.customerRows,
    importedCustomers: summary.importedCustomers,
    optometryRows: summary.optometryRows,
    importedOptometry: summary.importedOptometry,
    skippedOptometry: summary.skippedOptometry,
    warningCount: summary.warningCount,
    errorCount: summary.errorCount,
    firstIssues: issues.slice(0, PREVIEW_ISSUE_LIMIT).map(toPublicIssue),
  };
}

function validateCsvHeaders(headers, requiredHeaders, label) {
  const headerSet = new Set(headers);
  const missingHeaders = requiredHeaders.filter((header) => !headerSet.has(header));
  if (missingHeaders.length > 0) {
    throw new CsvImportValidationError([`${label} 缺少必需列：${missingHeaders.join(", ")}`]);
  }
}

function toPublicIssue(issue) {
  return {
    level: issue.level,
    entity: issue.entity,
    sourceId: issue.sourceId,
    rowNumber: issue.rowNumber,
    message: issue.message,
  };
}

export async function importCsvFiles(prisma, tenant, customerFile, optometryFile) {
  const summary = await loadCsvImport(customerFile, optometryFile);
  return importCsvSummary(prisma, tenant, summary, {
    customerFile,
    optometryFile,
  });
}

export async function importCsvTexts(prisma, tenant, customerText, optometryText, options = {}) {
  const summary = loadCsvImportFromText(customerText, optometryText);
  return importCsvSummary(prisma, tenant, summary, {
    customerFile: options.customerFile || "uploaded-customer.csv",
    optometryFile: options.optometryFile || "uploaded-optometry.csv",
  });
}

export async function startCsvImportFromTexts(prisma, tenant, customerText, optometryText, options = {}) {
  const summary = loadCsvImportFromText(customerText, optometryText);
  return startCsvImportFromSummary(prisma, tenant, summary, options);
}

export async function startCsvImportFromSummary(prisma, tenant, summary, options = {}) {
  const batch = await createImportBatch(prisma, tenant, summary, {
    customerFile: options.customerFile || "uploaded-customer.csv",
    optometryFile: options.optometryFile || "uploaded-optometry.csv",
  });

  processImportBatch(prisma, tenant, batch, summary).catch((error) => {
    console.error(`Import batch ${batch.id} failed`, error);
  });

  return batch;
}

async function createImportBatch(prisma, tenant, summary, files) {
  return prisma.importBatch.create({
    data: {
      tenantId: tenant.id,
      status: "RUNNING",
      customerFile: files.customerFile,
      optometryFile: files.optometryFile,
      customerRows: summary.customerRows,
      optometryRows: summary.optometryRows,
    },
  });
}

export async function importCsvSummary(prisma, tenant, summary, files) {
  const batch = await createImportBatch(prisma, tenant, summary, files);
  return processImportBatch(prisma, tenant, batch, summary);
}

async function processImportBatch(prisma, tenant, batch, summary) {
  try {
    const issues = [...summary.customerIssues, ...summary.optometryIssues];
    const customerIdBySource = new Map();

    for (const customer of summary.customers) {
      const saved = await prisma.customer.upsert({
        where: {
          tenantId_sourceCustomerId: {
            tenantId: tenant.id,
            sourceCustomerId: customer.sourceCustomerId,
          },
        },
        update: {
          name: customer.name,
          gender: customer.gender,
          pinyin: customer.pinyin,
          primaryPhone: customer.primaryPhone,
          note: customer.note,
          sourceCreatedAt: customer.sourceCreatedAt,
          rawRow: customer.rawRow,
        },
        create: {
          tenantId: tenant.id,
          ...customer,
        },
      });
      customerIdBySource.set(customer.sourceCustomerId, saved.id);
    }

    for (const exam of summary.optometry) {
      const customerId = customerIdBySource.get(exam.sourceCustomerId);
      if (!customerId) {
        continue;
      }
      await prisma.optometryExam.upsert({
        where: {
          tenantId_sourceCustomerId_examAt: {
            tenantId: tenant.id,
            sourceCustomerId: exam.sourceCustomerId,
            examAt: exam.examAt,
          },
        },
        update: {
          customerId,
          distanceRight: exam.distanceRight,
          distanceLeft: exam.distanceLeft,
          nearRight: exam.nearRight,
          nearLeft: exam.nearLeft,
          pupil: exam.pupil,
          comment: exam.comment,
          rawRow: exam.rawRow,
        },
        create: {
          tenantId: tenant.id,
          customerId,
          ...exam,
        },
      });
    }

    if (issues.length > 0) {
      await prisma.importIssue.createMany({
        data: issues.map((issue) => ({
          batchId: batch.id,
          level: issue.level,
          entity: issue.entity,
          sourceId: issue.sourceId,
          rowNumber: issue.rowNumber,
          message: issue.message,
          rawRow: issue.rawRow,
        })),
      });
    }

    return prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        importedCustomers: summary.importedCustomers,
        importedOptometry: summary.importedOptometry,
        skippedOptometry: summary.skippedOptometry,
        warningCount: summary.warningCount,
        errorCount: summary.errorCount,
        finishedAt: new Date(),
      },
      include: { issues: { orderBy: { createdAt: "asc" }, take: 100 } },
    });
  } catch (error) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        errorCount: { increment: 1 },
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function clearBusinessData(prisma, tenant) {
  const importBatches = await prisma.importBatch.findMany({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  const importBatchIds = importBatches.map((batch) => batch.id);
  const [issues, batches, exams, customers] = await prisma.$transaction([
    prisma.importIssue.deleteMany({
      where: { batchId: { in: importBatchIds } },
    }),
    prisma.importBatch.deleteMany({
      where: { tenantId: tenant.id },
    }),
    prisma.optometryExam.deleteMany({
      where: { tenantId: tenant.id },
    }),
    prisma.customer.deleteMany({
      where: { tenantId: tenant.id },
    }),
  ]);

  return {
    deletedImportIssues: issues.count,
    deletedImportBatches: batches.count,
    deletedOptometryExams: exams.count,
    deletedCustomers: customers.count,
  };
}
