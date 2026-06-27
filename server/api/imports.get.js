import { getTenant, prisma } from "../utils/tenant.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const batches = await prisma.importBatch.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { issues: { orderBy: { createdAt: "asc" }, take: 20 } },
  });

  return { tenant, batches };
});

