import { resolve } from "node:path";
import { loadCsvImport, importCsvFiles } from "../src/lib/importService.js";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value] = arg.split("=");
  return [key, value ?? true];
}));

const customerFile = resolve(String(args.get("--customers") || "t_customer.csv"));
const optometryFile = resolve(String(args.get("--optometry") || "t_optometry.csv"));
const tenantCode = String(args.get("--tenant") || "main");
const shouldWrite = args.has("--write");

if (!shouldWrite) {
  const summary = await loadCsvImport(customerFile, optometryFile);
  console.log(JSON.stringify({
    mode: "dry-run",
    customerRows: summary.customerRows,
    importedCustomers: summary.importedCustomers,
    optometryRows: summary.optometryRows,
    importedOptometry: summary.importedOptometry,
    skippedOptometry: summary.skippedOptometry,
    warningCount: summary.warningCount,
    errorCount: summary.errorCount,
    firstIssues: [...summary.customerIssues, ...summary.optometryIssues].slice(0, 20),
  }, null, 2));
  process.exit(0);
}

const { prisma } = await import("../src/lib/prisma.js");
const { resolveTenant } = await import("../src/lib/auth.js");
const tenant = await resolveTenant(prisma, tenantCode);
const batch = await importCsvFiles(prisma, tenant, customerFile, optometryFile);
await prisma.$disconnect();
console.log(JSON.stringify(batch, null, 2));
