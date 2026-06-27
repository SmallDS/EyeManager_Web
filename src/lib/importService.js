import { readFile } from "node:fs/promises";
import { parseCsv } from "./csv.mjs";
import { summarizeImport } from "./importRules.mjs";

export async function loadCsvImport(customerFile, optometryFile) {
  const [customerText, optometryText] = await Promise.all([
    readFile(customerFile, "utf8"),
    readFile(optometryFile, "utf8"),
  ]);
  return loadCsvImportFromText(customerText, optometryText);
}

export function loadCsvImportFromText(customerText, optometryText) {
  return summarizeImport(parseCsv(customerText), parseCsv(optometryText));
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
          secondaryPhone: customer.secondaryPhone,
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
