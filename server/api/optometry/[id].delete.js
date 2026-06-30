import { getTenant, prisma } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const id = getRouterParam(event, "id");

  await prisma.optometryExam.deleteMany({
    where: { id, tenantId: tenant.id },
  });

  return { ok: true };
});
