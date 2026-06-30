import { createError } from "h3";
import { getCurrentWxUser } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  const wxUser = await getCurrentWxUser(event);
  if (!wxUser) {
    throw createError({ statusCode: 401, message: "小程序登录已失效" });
  }

  const tenants = wxUser.wxUserTenants.map((item) => item.tenant);
  return {
    openId: wxUser.openId,
    status: tenants.length ? "READY" : "WAITING",
    tenants,
    currentTenant: tenants[0] || null,
  };
});
