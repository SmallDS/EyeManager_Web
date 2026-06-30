import { createHash, randomBytes } from "node:crypto";
import { createError, deleteCookie, getCookie, getHeader, getQuery, readBody, setCookie } from "h3";
import { PrismaClient } from "@prisma/client";
import { hashPassword, maskSecret, verifyPassword } from "~~/src/lib/security.mjs";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const AUTH_COOKIE = "eye_session";
const TENANT_COOKIE = "eye_tenant";
const SESSION_DAYS = 7;
const WX_SESSION_DAYS = 30;

export function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function isAdminRole(role) {
  return role === "ADMIN" || role === "OWNER";
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function expiresInDays(days) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export { hashPassword, maskSecret, verifyPassword };

export async function ensureBootstrapAdmin() {
  const account = cleanText(process.env.ADMIN_ACCOUNT);
  const password = cleanText(process.env.ADMIN_PASSWORD);
  if (!account || !password) return null;

  const adminCount = await prisma.user.count({ where: { role: { in: ["ADMIN", "OWNER"] } } });
  if (adminCount > 0) return null;

  const { passwordHash, passwordSalt } = hashPassword(password);
  return prisma.user.create({
    data: {
      account,
      name: account,
      role: "ADMIN",
      passwordHash,
      passwordSalt,
    },
  });
}

export async function createWebSession(event, userId) {
  const token = createToken();
  const expiresAt = expiresInDays(SESSION_DAYS);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });
  setCookie(event, AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function clearWebSession(event) {
  const token = getCookie(event, AUTH_COOKIE);
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  deleteCookie(event, AUTH_COOKIE, { path: "/" });
  deleteCookie(event, TENANT_COOKIE, { path: "/" });
}

export async function getCurrentUser(event) {
  await ensureBootstrapAdmin();
  const token = getCookie(event, AUTH_COOKIE);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          userTenants: {
            include: { tenant: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    await clearWebSession(event);
    return null;
  }

  return session.user;
}

export async function requireUser(event) {
  const user = await getCurrentUser(event);
  if (!user) {
    throw createError({ statusCode: 401, message: "请先登录" });
  }
  return user;
}

export async function requireAdmin(event) {
  const user = await requireUser(event);
  if (!isAdminRole(user.role)) {
    throw createError({ statusCode: 403, message: "仅管理员可操作" });
  }
  return user;
}

async function ensureMainTenant() {
  const existing = await prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.tenant.create({
    data: { code: "main", name: "默认门店" },
  });
}

function tenantSelector(event) {
  const query = getQuery(event);
  const headerSelector = getHeader(event, "x-tenant-id") || getHeader(event, "x-tenant-code");
  if (headerSelector) return { value: headerSelector, source: "request" };
  const querySelector = query.tenantId || query.tenant;
  if (querySelector) return { value: querySelector, source: "request" };
  const cookieSelector = getCookie(event, TENANT_COOKIE);
  if (cookieSelector) return { value: cookieSelector, source: "cookie" };
  return { value: null, source: "none" };
}

function matchTenant(tenant, selector) {
  return tenant.id === selector || tenant.code === selector;
}

export async function getAvailableTenants(user) {
  if (isAdminRole(user.role)) {
    const tenants = await prisma.tenant.findMany({ orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
    if (tenants.length) return tenants;
    return [await ensureMainTenant()];
  }
  return user.userTenants.map((item) => item.tenant);
}

export async function requireTenantAccess(event) {
  const user = await requireUser(event);
  const selector = tenantSelector(event);
  const tenants = await getAvailableTenants(user);

  if (!tenants.length) {
    throw createError({ statusCode: 403, message: "当前账号未分配门店" });
  }

  let tenant = selector.value ? tenants.find((item) => matchTenant(item, selector.value)) : tenants[0];
  if (!tenant && selector.source === "cookie") {
    tenant = tenants[0];
  }
  if (!tenant) {
    throw createError({ statusCode: 403, message: "无权访问该门店" });
  }

  setCookie(event, TENANT_COOKIE, tenant.id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return { user, tenant, tenants, isAdmin: isAdminRole(user.role) };
}

export async function selectTenant(event) {
  const body = await readBody(event);
  const selector = cleanText(body?.tenantId || body?.tenantCode);
  if (!selector) {
    throw createError({ statusCode: 400, message: "请选择门店" });
  }
  const user = await requireUser(event);
  const tenants = await getAvailableTenants(user);
  const tenant = tenants.find((item) => matchTenant(item, selector));
  if (!tenant) {
    throw createError({ statusCode: 403, message: "无权访问该门店" });
  }
  setCookie(event, TENANT_COOKIE, tenant.id, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return { tenant };
}

export async function createWxSession(wxUserId) {
  const token = createToken();
  await prisma.wxSession.create({
    data: {
      tokenHash: hashToken(token),
      wxUserId,
      expiresAt: expiresInDays(WX_SESSION_DAYS),
    },
  });
  return token;
}

export function getWxToken(event) {
  const authorization = getHeader(event, "authorization") || "";
  if (authorization.startsWith("Bearer ")) return authorization.slice(7);
  return getHeader(event, "x-wx-session") || null;
}

export async function getCurrentWxUser(event) {
  const token = getWxToken(event);
  if (!token) return null;
  const session = await prisma.wxSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      wxUser: {
        include: {
          wxUserTenants: {
            include: { tenant: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.wxSession.delete({ where: { id: session.id } });
    return null;
  }

  await prisma.wxUser.update({
    where: { id: session.wxUserId },
    data: { lastSeenAt: new Date() },
  });

  return session.wxUser;
}

export async function requireWxTenantAccess(event) {
  const wxUser = await getCurrentWxUser(event);
  if (!wxUser) {
    throw createError({ statusCode: 401, message: "小程序登录已失效" });
  }

  const tenants = wxUser.wxUserTenants.map((item) => item.tenant);
  if (!tenants.length) {
    throw createError({ statusCode: 403, message: "等待管理员分配门店" });
  }

  const selector = tenantSelector(event);
  const tenant = selector ? tenants.find((item) => matchTenant(item, selector)) : tenants[0];
  if (!tenant) {
    throw createError({ statusCode: 403, message: "无权访问该门店" });
  }

  return { wxUser, tenant, tenants };
}

export async function requireBusinessTenant(event) {
  const user = await getCurrentUser(event);
  if (user) {
    return requireTenantAccess(event);
  }
  const wxScoped = await requireWxTenantAccess(event);
  return {
    user: null,
    wxUser: wxScoped.wxUser,
    tenant: wxScoped.tenant,
    tenants: wxScoped.tenants,
    isAdmin: false,
  };
}

export async function getTenant(event) {
  const scoped = await requireBusinessTenant(event);
  return scoped.tenant;
}

export async function resolveTenant(prismaClient, tenantCode) {
  return prismaClient.tenant.upsert({
    where: { code: tenantCode },
    update: {},
    create: {
      code: tenantCode,
      name: tenantCode === "main" ? "默认门店" : tenantCode,
    },
  });
}
