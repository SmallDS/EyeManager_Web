import { getQuery } from "h3";
import { getTenant, prisma } from "../utils/auth.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const queryParams = getQuery(event);
  const query = String(queryParams.q || "").trim();
  const take = Math.min(Number(queryParams.take || 100), 100);
  const skip = Math.max(Number(queryParams.skip || 0), 0);

  const whereClause = {
    tenantId: tenant.id,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { primaryPhone: { contains: query } },
            { sourceCustomerId: { contains: query } },
            { pinyin: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        name: true,
        gender: true,
        primaryPhone: true,
        note: true,
        updatedAt: true,
        _count: { select: { optometryExams: true } },
      },
    }),
    prisma.customer.count({ where: whereClause }),
  ]);

  return { tenant, customers, total };
});
