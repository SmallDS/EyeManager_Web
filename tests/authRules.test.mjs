import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, maskSecret, verifyPassword } from "../src/lib/security.mjs";
import { resolveTenantForSelector } from "../src/lib/tenantAccess.mjs";
import {
  createAppIdMismatchResponse,
  createOpenIdMissingResponse,
  createWechatDiagnostics,
  maskAppId,
  normalizeWechatSessionResult,
  WX_APPID_MISMATCH_CODE,
  WX_OPENID_MISSING_CODE,
  WX_SESSION_TIMEOUT_MS,
  WX_SESSION_UPSTREAM_ERROR_MESSAGE,
} from "../src/lib/wxAuth.mjs";

test("password hashing verifies the original password only", () => {
  const { passwordHash, passwordSalt } = hashPassword("secret-password");

  assert.equal(verifyPassword("secret-password", passwordHash, passwordSalt), true);
  assert.equal(verifyPassword("wrong-password", passwordHash, passwordSalt), false);
});

test("wechat secret mask does not reveal full value", () => {
  assert.equal(maskSecret(""), "");
  assert.equal(maskSecret("abc"), "******");
  assert.equal(maskSecret("abcdef123456"), "abc******456");
});

test("wechat login without openid returns a terminal error state", () => {
  const response = createOpenIdMissingResponse();

  assert.equal(response.status, "ERROR");
  assert.equal(response.code, WX_OPENID_MISSING_CODE);
  assert.equal(response.openId, "");
  assert.deepEqual(response.tenants, []);
  assert.equal(response.currentTenant, null);
  assert.match(response.message, /APPID\/SECRET/);
});

test("wechat appid mismatch response does not expose full appids", () => {
  const response = createAppIdMismatchResponse("wxe5b08065cf9f09e3", "wx1234567890abcdef");

  assert.equal(response.status, "ERROR");
  assert.equal(response.code, WX_APPID_MISMATCH_CODE);
  assert.equal(response.details.configuredAppId, "wxe5...09e3");
  assert.equal(response.details.clientAppId, "wx12...cdef");
  assert.match(response.message, /不一致/);
});

test("wechat appid mask handles short values", () => {
  assert.equal(maskAppId(""), "");
  assert.equal(maskAppId("wx123"), "wx123");
});

test("wechat diagnostics include safe appids and response keys", () => {
  const diagnostics = createWechatDiagnostics({
    configuredAppId: "wxe5b08065cf9f09e3",
    clientAppId: "wx1234567890abcdef",
    wxResult: { errcode: 40029, errmsg: "invalid code" },
  });

  assert.deepEqual(diagnostics, {
    configuredAppId: "wxe5...09e3",
    clientAppId: "wx12...cdef",
    responseKeys: ["errcode", "errmsg"],
    errcode: 40029,
  });
});

test("wechat session result parses json string responses", () => {
  const result = normalizeWechatSessionResult('{"session_key":"secret","openid":"openid-1"}');

  assert.deepEqual(result, {
    session_key: "secret",
    openid: "openid-1",
  });
});

test("wechat session result keeps invalid string responses for diagnostics", () => {
  assert.equal(normalizeWechatSessionResult("not-json"), "not-json");
});

test("wechat upstream timeout message is actionable", () => {
  assert.equal(WX_SESSION_TIMEOUT_MS, 8000);
  assert.match(WX_SESSION_UPSTREAM_ERROR_MESSAGE, /api\.weixin\.qq\.com/);
});

test("tenant selector resolves by value and defaults when absent", () => {
  const tenants = [
    { id: "tenant-1", code: "main" },
    { id: "tenant-2", code: "branch" },
  ];

  assert.equal(resolveTenantForSelector(tenants, { value: "tenant-2" }), tenants[1]);
  assert.equal(resolveTenantForSelector(tenants, { value: "branch" }), tenants[1]);
  assert.equal(resolveTenantForSelector(tenants, { value: null }), tenants[0]);
  assert.equal(resolveTenantForSelector(tenants, { value: "missing" }), null);
});
