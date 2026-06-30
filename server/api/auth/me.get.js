import { getCurrentUser, getAvailableTenants, isAdminRole, requireTenantAccess } from "../../utils/auth.js";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event);
  if (!user) {
    return { authenticated: false };
  }

  const tenants = await getAvailableTenants(user);
  const scoped = tenants.length ? await requireTenantAccess(event) : { tenant: null };

  return {
    authenticated: true,
    user: {
      id: user.id,
      account: user.account,
      name: user.name,
      role: user.role,
      isAdmin: isAdminRole(user.role),
    },
    tenants,
    currentTenant: scoped.tenant,
  };
});
