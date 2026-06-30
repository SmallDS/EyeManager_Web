import { maskSecret, prisma, requireAdmin } from "../../../utils/auth.js";

const APPID_KEY = "wechat.appid";
const SECRET_KEY = "wechat.secret";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [APPID_KEY, SECRET_KEY] } },
  });
  const appId = settings.find((item) => item.key === APPID_KEY)?.value || "";
  const secret = settings.find((item) => item.key === SECRET_KEY)?.value || "";

  return {
    appId,
    secretConfigured: Boolean(secret),
    secretMasked: maskSecret(secret),
  };
});
