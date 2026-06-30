<script setup>
import { ElMessage } from "element-plus";
import { Notebook, Plus, Search } from "@element-plus/icons-vue";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const inputQuery = ref("");
const activeQuery = ref("");
const currentTime = ref("");
const currentDate = ref("");
const createDialogVisible = ref(false);
const creating = ref(false);
const createForm = reactive({
  name: "",
  primaryPhone: "",
  secondaryPhone: "",
  gender: "",
  note: "",
});
let clockTimer;

const { data: dashboard, refresh: refreshDashboard } = await useAsyncData(
  "dashboard",
  () => $fetch("/api/dashboard", { headers: requestHeaders }),
);

const { data: customers, pending: customersPending, refresh: refreshCustomers } = await useAsyncData(
  "home-customers",
  () => $fetch("/api/customers", { query: { q: activeQuery.value }, headers: requestHeaders }),
);

const hasSearch = computed(() => Boolean(activeQuery.value));
const searchResultCount = computed(() => customers.value?.total ?? customers.value?.customers?.length ?? 0);

function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  currentDate.value = now.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "long" });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("zh-CN") : "-";
}

function searchCustomers() {
  activeQuery.value = inputQuery.value.trim();
  refreshCustomers();
}

function resetSearch() {
  inputQuery.value = "";
  activeQuery.value = "";
  refreshCustomers();
}

function resetCreateForm() {
  createForm.name = "";
  createForm.primaryPhone = "";
  createForm.secondaryPhone = "";
  createForm.gender = "";
  createForm.note = "";
}

async function createCustomer() {
  creating.value = true;
  try {
    const result = await $fetch("/api/customers", {
      method: "POST",
      body: createForm,
    });
    ElMessage.success("顾客已新增");
    createDialogVisible.value = false;
    resetCreateForm();
    await navigateTo(`/customers/${result.customer.id}`);
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  updateClock();
  clockTimer = window.setInterval(updateClock, 10000);
  refreshDashboard();
  refreshCustomers();
});

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer);
});
</script>

<template>
  <div>
    <section class="home-hero">
      <div class="hero-head">
        <div>
          <h1>{{ dashboard?.tenant?.name || "默认门店" }}</h1>
          <p>多门店租户后台，当前查看该门店数据。</p>
        </div>
        <el-button type="primary" plain :icon="Plus" @click="createDialogVisible = true">新增顾客</el-button>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <span class="hero-number">{{ dashboard?.customerCount ?? 0 }}</span>
          <span class="hero-label">顾客档案</span>
        </div>
        <div class="hero-divider" />
        <div class="hero-stat">
          <span class="hero-number">{{ dashboard?.examCount ?? 0 }}</span>
          <span class="hero-label">验光记录</span>
        </div>
        <div class="hero-divider" />
        <div class="hero-stat">
          <span class="hero-number">{{ hasSearch ? searchResultCount : currentTime }}</span>
          <span class="hero-label">{{ hasSearch ? "搜索结果" : currentDate }}</span>
        </div>
      </div>
    </section>

    <section id="customers" class="customer-panel">
      <div class="customer-toolbar">
        <div>
          <h2>顾客档案</h2>
          <p>支持按姓名、手机号和助记码检索。</p>
        </div>
        <div class="search-bar">
          <el-input
            v-model="inputQuery"
            clearable
            placeholder="输入姓名、手机号、助记码搜索顾客"
            @keyup.enter="searchCustomers"
            @clear="resetSearch"
          />
          <el-button type="primary" :icon="Search" @click="searchCustomers">搜索</el-button>
          <el-button @click="resetSearch">清空</el-button>
        </div>
      </div>

      <div class="tenant-banner">
        <span class="tenant-tag">当前门店</span>
        <span class="tenant-name">{{ dashboard?.tenant?.name || "默认门店" }} ({{ dashboard?.tenant?.code || "main" }})</span>
      </div>

      <el-table v-loading="customersPending" :data="customers?.customers || []" class="customer-table full-width" row-key="id">
        <el-table-column label="姓名" min-width="160">
          <template #default="{ row }">
            <NuxtLink class="table-link" :to="`/customers/${row.id}`">{{ row.name }}</NuxtLink>
          </template>
        </el-table-column>
        <el-table-column label="电话" min-width="150">
          <template #default="{ row }">
            {{ row.primaryPhone || row.secondaryPhone || "无" }}
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="100">
          <template #default="{ row }">
            <el-tag :type="row.gender === '男' ? '' : (row.gender === '女' ? 'danger' : 'info')">
              {{ row.gender || "未知" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="验光数" width="100">
          <template #default="{ row }">
            <span class="exam-count">{{ row._count?.optometryExams || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="220">
          <template #default="{ row }">{{ row.note || "无" }}</template>
        </el-table-column>
      </el-table>
    </section>

    <section class="dashboard-grid">
      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <strong>最近验光记录</strong>
            <el-button text type="primary" :icon="Notebook" @click="navigateTo('/#customers')">查看顾客</el-button>
          </div>
        </template>
        <el-empty v-if="!dashboard?.recentExams?.length" description="暂无验光记录" />
        <el-table v-else :data="dashboard.recentExams" class="full-width">
          <el-table-column label="顾客" min-width="140">
            <template #default="{ row }">
              <NuxtLink class="table-link" :to="`/customers/${row.customer.id}`">{{ row.customer.name }}</NuxtLink>
            </template>
          </el-table-column>
          <el-table-column label="电话" min-width="140">
            <template #default="{ row }">{{ row.customer.primaryPhone || row.customer.secondaryPhone || "无" }}</template>
          </el-table-column>
          <el-table-column label="验光日期" width="130">
            <template #default="{ row }">{{ formatDate(row.examAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <el-dialog v-model="createDialogVisible" title="新增顾客" width="620px">
      <el-form :model="createForm" label-width="86px">
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item label="主电话">
          <el-input v-model="createForm.primaryPhone" />
        </el-form-item>
        <el-form-item label="备用电话">
          <el-input v-model="createForm.secondaryPhone" />
        </el-form-item>
        <el-form-item label="性别">
          <el-input v-model="createForm.gender" />
        </el-form-item>
        <el-form-item label="顾客备注">
          <el-input v-model="createForm.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createCustomer">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
