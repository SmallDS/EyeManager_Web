export function matchTenantSelector(tenant, selector) {
  return tenant.id === selector || tenant.code === selector;
}

export function resolveTenantForSelector(tenants, selector) {
  if (!selector?.value) return tenants[0] || null;
  return tenants.find((item) => matchTenantSelector(item, selector.value)) || null;
}
