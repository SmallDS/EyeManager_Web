import { getQuery } from "h3";
import { getTenant, prisma } from "../utils/tenant.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const queryParams = getQuery(event);
  const query = String(queryParams.q || "").trim();
  const take = Math.min(Number(queryParams.take || 100), 100);

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { primaryPhone: { contains: query } },
              { secondaryPhone: { contains: query } },
              { sourceCustomerId: { contains: query } },
              { pinyin: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      gender: true,
      primaryPhone: true,
      secondaryPhone: true,
      note: true,
      updatedAt: true,
      _count: { select: { optometryExams: true } },
    },
  });

  return { tenant, customers };
});

