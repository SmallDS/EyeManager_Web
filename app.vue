<script setup>
import { ElMessage } from "element-plus";

const route = useRoute();
const isLoginPage = computed(() => route.path === "/login");
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data: auth, refresh } = await useAsyncData("auth-me", () => (
  $fetch("/api/auth/me", { headers: requestHeaders }).catch(() => ({ authenticated: false }))
));
const selectedTenantId = ref("");
const themeMode = ref("system");
let mediaQuery;

const themeOptions = [
  { label: "跟随系统", value: "system" },
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
];

function resolveTheme(mode = themeMode.value) {
  if (mode === "dark" || mode === "light") return mode;
  return mediaQuery?.matches ? "dark" : "light";
}

function applyTheme(mode = themeMode.value) {
  if (!process.client) return;
  document.documentElement.dataset.theme = resolveTheme(mode);
  document.documentElement.classList.toggle("dark", resolveTheme(mode) === "dark");
}

watch(
  () => auth.value?.currentTenant?.id,
  (id) => {
    selectedTenantId.value = id || "";
  },
  { immediate: true },
);

const showTenantSelect = computed(() => (auth.value?.tenants?.length || 0) > 1);
const isAdmin = computed(() => Boolean(auth.value?.user?.isAdmin));

watch(themeMode, (mode) => {
  if (!process.client) return;
  localStorage.setItem("eye-theme-mode", mode);
  applyTheme(mode);
});

onMounted(() => {
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  themeMode.value = localStorage.getItem("eye-theme-mode") || "system";
  applyTheme(themeMode.value);
  mediaQuery.addEventListener("change", () => {
    if (themeMode.value === "system") applyTheme("system");
  });
});

async function changeTenant(tenantId) {
  if (!tenantId) return;
  await $fetch("/api/auth/tenant", {
    method: "POST",
    body: { tenantId },
  });
  await refresh();
  if (process.client) window.location.reload();
}

async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  ElMessage.success("已退出登录");
  await navigateTo("/login");
}
</script>

<template>
  <el-config-provider namespace="el">
    <div v-if="isLoginPage" class="shell">
      <NuxtPage />
    </div>
    <div v-else class="shell">
      <header class="topbar">
        <NuxtLink class="brand" to="/">眼镜店管理系统</NuxtLink>
        <nav class="nav" aria-label="主导航">
          <NuxtLink to="/#customers">顾客</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/imports">导入</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/tenants">门店</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/users">员工</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/wx-users">小程序用户</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin/settings">设置</NuxtLink>
        </nav>
        <div v-if="auth?.authenticated" class="top-actions">
          <el-select
            v-model="themeMode"
            class="theme-select"
            aria-label="主题模式"
            size="small"
          >
            <el-option v-for="item in themeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select
            v-if="showTenantSelect"
            v-model="selectedTenantId"
            placeholder="选择门店"
            style="width: 180px"
            @change="changeTenant"
          >
            <el-option v-for="tenant in auth.tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
          <span class="muted">{{ auth.user?.name || auth.user?.account }}</span>
          <el-button size="small" @click="logout">退出</el-button>
        </div>
      </header>
      <main class="main">
        <NuxtPage />
      </main>
    </div>
  </el-config-provider>
</template>
