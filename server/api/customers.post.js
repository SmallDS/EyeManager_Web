import { randomUUID } from "node:crypto";
import { readBody } from "h3";
import { cleanText, getTenant, prisma } from "../utils/auth.js";
import { generatePinyinCode } from "../utils/pinyin.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const body = await readBody(event);
  const name = cleanText(body?.name) || "未命名顾客";
  const createdAt = new Date();

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      sourceCustomerId: `manual-${randomUUID()}`,
      name,
      gender: cleanText(body?.gender),
      pinyin: generatePinyinCode(name) || null,
      primaryPhone: cleanText(body?.primaryPhone),
      note: cleanText(body?.note),
      sourceCreatedAt: createdAt,
      rawRow: { source: "manual", createdAt: createdAt.toISOString() },
    },
  });

  return { tenant, customer };
});
