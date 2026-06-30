export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login") return;

  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const auth = await $fetch("/api/auth/me", { headers }).catch(() => null);
  if (!auth?.authenticated) {
    return navigateTo("/login");
  }
});
