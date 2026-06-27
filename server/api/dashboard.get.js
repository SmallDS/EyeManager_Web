import { getTenant, prisma } from "../utils/tenant.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const [customerCount, examCount, recentCustomers, recentExams] = await Promise.all([
    prisma.customer.count({ where: { tenantId: tenant.id } }),
    prisma.optometryExam.count({ where: { tenantId: tenant.id } }),
    prisma.customer.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        primaryPhone: true,
        secondaryPhone: true,
        updatedAt: true,
        _count: { select: { optometryExams: true } },
      },
    }),
    prisma.optometryExam.findMany({
      where: { tenantId: tenant.id },
      orderBy: { examAt: "desc" },
      take: 6,
      select: {
        id: true,
        examAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            primaryPhone: true,
            secondaryPhone: true,
          },
        },
      },
    }),
  ]);

  return { tenant, customerCount, examCount, recentCustomers, recentExams };
});
