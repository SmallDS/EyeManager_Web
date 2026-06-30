import { createError, readBody } from "h3";
import { cleanText, getTenant, prisma } from "../../utils/auth.js";
import { eyeRows, normalizeEyeGroup, normalizePupilGroup, parseExamDate } from "../../utils/prescription.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const exam = await prisma.optometryExam.findFirst({
    where: { id, tenantId: tenant.id },
    select: { id: true },
  });

  if (!exam) {
    throw createError({ statusCode: 404, message: "验光单不存在" });
  }

  const updated = await prisma.optometryExam.update({
    where: { id },
    data: {
      examAt: parseExamDate(body?.examAt),
      distanceRight: normalizeEyeGroup(body, eyeRows[0]),
      distanceLeft: normalizeEyeGroup(body, eyeRows[1]),
      nearRight: normalizeEyeGroup(body, eyeRows[2]),
      nearLeft: normalizeEyeGroup(body, eyeRows[3]),
      pupil: normalizePupilGroup(body),
      comment: cleanText(body?.comment),
    },
  });

  return { tenant, exam: updated };
});
