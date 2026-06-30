import { createError, readBody } from "h3";
import {
  createAppIdMismatchResponse,
  createOpenIdMissingResponse,
  createWechatDiagnostics,
  createWechatLoginFailedResponse,
  normalizeWechatSessionResult,
  WX_SESSION_TIMEOUT_MS,
  WX_SESSION_UPSTREAM_ERROR_MESSAGE,
} from "~~/src/lib/wxAuth.mjs";
import { cleanText, createWxSession, prisma } from "../../utils/auth.js";

const APPID_KEY = "wechat.appid";
const SECRET_KEY = "wechat.secret";

function warnWechatLogin(message, details = {}) {
  console.warn("[wx/session]", message, details);
}

async function getWechatConfig() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [APPID_KEY, SECRET_KEY] } },
  });
  return {
    appId: settings.find((item) => item.key === APPID_KEY)?.value || "",
    secret: settings.find((item) => item.key === SECRET_KEY)?.value || "",
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const code = cleanText(body?.code);
  const clientAppId = cleanText(body?.appId);
  if (!code) {
    throw createError({ statusCode: 400, message: "缺少微信登录 code" });
  }

  const { appId, secret } = await getWechatConfig();
  if (!appId || !secret) {
    throw createError({ statusCode: 500, message: "后台尚未配置微信小程序参数" });
  }
  if (clientAppId && appId !== clientAppId) {
    warnWechatLogin("appid mismatch", createWechatDiagnostics({ configuredAppId: appId, clientAppId }));
    return createAppIdMismatchResponse(appId, clientAppId);
  }

  let wxResult;
  try {
    wxResult = await $fetch("https://api.weixin.qq.com/sns/jscode2session", {
      timeout: WX_SESSION_TIMEOUT_MS,
      query: {
        appid: appId,
        secret,
        js_code: code,
        grant_type: "authorization_code",
      },
    });
    wxResult = normalizeWechatSessionResult(wxResult);
  } catch (error) {
    warnWechatLogin("jscode2session request failed", {
      ...createWechatDiagnostics({ configuredAppId: appId, clientAppId }),
      errorName: error?.name,
      errorMessage: error?.message,
    });
    throw createError({ statusCode: 502, message: WX_SESSION_UPSTREAM_ERROR_MESSAGE });
  }

  const diagnostics = createWechatDiagnostics({ configuredAppId: appId, clientAppId, wxResult });
  if (wxResult?.errcode) {
    warnWechatLogin("jscode2session returned error", diagnostics);
    return createWechatLoginFailedResponse(wxResult.errmsg || "微信登录失败", diagnostics);
  }
  if (!wxResult?.openid) {
    warnWechatLogin("jscode2session returned no openid", diagnostics);
    return createOpenIdMissingResponse(diagnostics);
  }

  const wxUser = await prisma.wxUser.upsert({
    where: { openId: wxResult.openid },
    update: { lastSeenAt: new Date() },
    create: { openId: wxResult.openid },
    include: {
      wxUserTenants: {
        include: { tenant: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const token = await createWxSession(wxUser.id);
  const tenants = wxUser.wxUserTenants.map((item) => item.tenant);

  return {
    token,
    openId: wxUser.openId,
    status: tenants.length ? "READY" : "WAITING",
    tenants,
    currentTenant: tenants[0] || null,
  };
});
