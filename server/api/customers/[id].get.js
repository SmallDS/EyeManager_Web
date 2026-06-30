import { createError } from "h3";
import { getTenant, prisma } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const id = getRouterParam(event, "id");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      optometryExams: { orderBy: { examAt: "desc" } },
    },
  });

  if (!customer) {
    throw createError({ statusCode: 404, message: "顾客不存在" });
  }

  return { tenant, customer };
});
