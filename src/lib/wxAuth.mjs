export const WX_APPID_MISMATCH_CODE = "WX_APPID_MISMATCH";
export const WX_LOGIN_FAILED_CODE = "WX_LOGIN_FAILED";
export const WX_OPENID_MISSING_CODE = "WX_OPENID_MISSING";
export const WX_SESSION_TIMEOUT_MS = 8000;

export const WX_OPENID_MISSING_MESSAGE = "微信未返回 openid，请检查后台小程序 APPID/SECRET 配置是否正确。";
export const WX_SESSION_UPSTREAM_ERROR_MESSAGE =
  "连接微信登录服务超时或失败，请检查服务器网络是否能访问 api.weixin.qq.com 后重试。";

export function maskAppId(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

export function normalizeWechatSessionResult(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function createWxAuthErrorResponse(code, message, details = {}) {
  return {
    status: "ERROR",
    code,
    message,
    openId: "",
    tenants: [],
    currentTenant: null,
    details,
  };
}

export function createWechatDiagnostics({ configuredAppId, clientAppId, wxResult } = {}) {
  const details = {
    configuredAppId: maskAppId(configuredAppId),
    clientAppId: maskAppId(clientAppId),
  };
  if (wxResult && typeof wxResult === "object") {
    details.responseKeys = Object.keys(wxResult);
    if (Object.prototype.hasOwnProperty.call(wxResult, "errcode")) {
      details.errcode = wxResult.errcode;
    }
  } else if (wxResult != null) {
    details.responseType = typeof wxResult;
  }
  return details;
}

export function createAppIdMismatchResponse(configuredAppId, clientAppId) {
  return createWxAuthErrorResponse(
    WX_APPID_MISMATCH_CODE,
    "当前小程序 AppID 与后台配置的微信 APPID 不一致，请在后台系统设置中改为当前小程序的 APPID。",
    {
      configuredAppId: maskAppId(configuredAppId),
      clientAppId: maskAppId(clientAppId),
    },
  );
}

export function createWechatLoginFailedResponse(message, details = {}) {
  return createWxAuthErrorResponse(WX_LOGIN_FAILED_CODE, message || "微信登录失败", details);
}

export function createOpenIdMissingResponse(details = {}) {
  return createWxAuthErrorResponse(WX_OPENID_MISSING_CODE, WX_OPENID_MISSING_MESSAGE, details);
}
