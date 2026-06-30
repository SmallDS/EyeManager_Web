import { createError } from "h3";
import { getTenant, prisma } from "../../../utils/auth.js";
import { buildEmptyEyeGroup, buildEmptyPupilGroup, eyeRows } from "../../../utils/prescription.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const id = getRouterParam(event, "id");
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tenant.id },
    select: { id: true, sourceCustomerId: true },
  });

  if (!customer) {
    throw createError({ statusCode: 404, message: "顾客不存在" });
  }

  const createdAt = new Date();
  const exam = await prisma.optometryExam.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      sourceCustomerId: customer.sourceCustomerId,
      examAt: createdAt,
      distanceRight: buildEmptyEyeGroup(eyeRows[0]),
      distanceLeft: buildEmptyEyeGroup(eyeRows[1]),
      nearRight: buildEmptyEyeGroup(eyeRows[2]),
      nearLeft: buildEmptyEyeGroup(eyeRows[3]),
      pupil: buildEmptyPupilGroup(),
      comment: null,
      rawRow: { source: "manual", createdAt: createdAt.toISOString() },
    },
  });

  return { tenant, exam };
});
