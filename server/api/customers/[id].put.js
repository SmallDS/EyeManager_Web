import { readBody } from "h3";
import { cleanText, getTenant, prisma } from "../../utils/auth.js";
import { generatePinyinCode } from "../../utils/pinyin.js";

export default defineEventHandler(async (event) => {
  const tenant = await getTenant(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const name = cleanText(body?.name) || "未命名顾客";

  await prisma.customer.updateMany({
    where: { id, tenantId: tenant.id },
    data: {
      name,
      primaryPhone: cleanText(body?.primaryPhone),
      gender: cleanText(body?.gender),
      pinyin: generatePinyinCode(name) || null,
      note: cleanText(body?.note),
    },
  });

  const customer = await prisma.customer.findFirst({ where: { id, tenantId: tenant.id } });
  return { tenant, customer };
});
