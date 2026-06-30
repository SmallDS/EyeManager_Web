import { createError, readBody } from "h3";
import { cleanText, maskSecret, prisma, requireAdmin } from "../../../utils/auth.js";

const APPID_KEY = "wechat.appid";
const SECRET_KEY = "wechat.secret";

async function upsertSetting(key, value) {
  return prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const body = await readBody(event);
  const appId = cleanText(body?.appId);
  const secret = cleanText(body?.secret);

  if (!appId) {
    throw createError({ statusCode: 400, message: "请填写微信 APPID" });
  }

  await upsertSetting(APPID_KEY, appId);
  if (secret) {
    await upsertSetting(SECRET_KEY, secret);
  }

  const savedSecret = (await prisma.systemSetting.findUnique({ where: { key: SECRET_KEY } }))?.value || "";
  return {
    appId,
    secretConfigured: Boolean(savedSecret),
    secretMasked: maskSecret(savedSecret),
  };
});
