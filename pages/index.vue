<script setup>
import { ElMessage } from "element-plus";
import { Notebook, Plus, Search } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const pageSizeOptions = [20, 30, 50];
const initialListState = getListStateFromQuery(route.query);
const inputQuery = ref(initialListState.q);
const activeQuery = ref(initialListState.q);
const currentPage = ref(initialListState.page);
const pageSize = ref(initialListState.pageSize);
const currentTime = ref("");
const currentDate = ref("");
const createDialogVisible = ref(false);
const creating = ref(false);
const createFormRef = ref();
const createForm = reactive({
  name: "",
  primaryPhone: "",
  gender: "",
  note: "",
});
const createRules = {
  name: [
    {
      required: true,
      trigger: "blur",
      validator: (_rule, value, callback) => {
        if (String(value || "").trim()) {
          callback();
          return;
        }
        callback(new Error("请输入顾客姓名"));
      },
    },
  ],
};
const genderOptions = ["男", "女", "未知"];
let clockTimer;

const { data: dashboard, refresh: refreshDashboard } = await useAsyncData(
  "dashboard",
  () => $fetch("/api/dashboard", { headers: requestHeaders }),
);

const { data: customers, pending: customersPending, refresh: refreshCustomers } = await useAsyncData(
  "home-customers",
  () => $fetch("/api/customers", {
    query: {
      q: activeQuery.value,
      take: pageSize.value,
      skip: (currentPage.value - 1) * pageSize.value,
    },
    headers: requestHeaders,
  }),
);

const hasSearch = computed(() => Boolean(activeQuery.value));
const searchResultCount = computed(() => customers.value?.total ?? customers.value?.customers?.length ?? 0);
const customerRows = computed(() => customers.value?.customers || []);
const customerTotal = computed(() => customers.value?.total ?? 0);
const customerSummary = computed(() => {
  if (!customerTotal.value) return hasSearch.value ? "没有匹配的顾客" : "暂无顾客档案";
  return hasSearch.value
    ? `共 ${customerTotal.value} 条搜索结果`
    : `共 ${customerTotal.value} 位顾客`;
});
const listRouteQuery = computed(() => {
  const query = {
    page: String(currentPage.value),
    pageSize: String(pageSize.value),
  };
  if (activeQuery.value) query.q = activeQuery.value;
  return query;
});
const customerListLocation = computed(() => ({
  path: "/",
  query: listRouteQuery.value,
  hash: "#customers",
}));

function getQueryValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getPositiveNumber(value, fallback) {
  const number = Number.parseInt(getQueryValue(value), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getListStateFromQuery(query) {
  const nextPageSize = getPositiveNumber(query?.pageSize, 20);
  return {
    q: getQueryValue(query?.q).trim(),
    page: getPositiveNumber(query?.page, 1),
    pageSize: pageSizeOptions.includes(nextPageSize) ? nextPageSize : 20,
  };
}

function customerDetailLocation(id) {
  return {
    path: `/customers/${id}`,
    query: listRouteQuery.value,
  };
}

async function updateListRoute() {
  await router.replace(customerListLocation.value);
}

async function goCustomerList() {
  await navigateTo(customerListLocation.value);
}

function updateClock() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  currentDate.value = now.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", weekday: "long" });
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("zh-CN") : "-";
}

async function searchCustomers() {
  activeQuery.value = inputQuery.value.trim();
  currentPage.value = 1;
  await updateListRoute();
  refreshCustomers();
}

async function resetSearch() {
  inputQuery.value = "";
  activeQuery.value = "";
  currentPage.value = 1;
  await updateListRoute();
  refreshCustomers();
}

async function changePage(page) {
  currentPage.value = page;
  await updateListRoute();
  refreshCustomers();
}

async function changePageSize(size) {
  pageSize.value = size;
  currentPage.value = 1;
  await updateListRoute();
  refreshCustomers();
}

function resetCreateForm() {
  createForm.name = "";
  createForm.primaryPhone = "";
  createForm.gender = "";
  createForm.note = "";
  createFormRef.value?.clearValidate();
}

async function createCustomer() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  creating.value = true;
  try {
    const result = await $fetch("/api/customers", {
      method: "POST",
      body: {
        name: createForm.name.trim(),
        primaryPhone: createForm.primaryPhone.trim(),
        gender: createForm.gender,
        note: createForm.note.trim(),
      },
    });
    ElMessage.success("顾客已新增");
    createDialogVisible.value = false;
    resetCreateForm();
    await navigateTo(customerDetailLocation(result.customer.id));
  } catch (error) {
    ElMessage.error(error?.data?.message || "新增顾客失败，请稍后重试");
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
          <p>今天的顾客档案、验光记录和最近活动概览。</p>
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
          <p>{{ customerSummary }}</p>
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

      <el-table
        v-loading="customersPending"
        :data="customerRows"
        class="customer-table full-width"
        empty-text="暂无顾客档案"
        row-key="id"
      >
        <el-table-column label="姓名" min-width="160">
          <template #default="{ row }">
            <NuxtLink class="table-link" :to="customerDetailLocation(row.id)">{{ row.name }}</NuxtLink>
          </template>
        </el-table-column>
        <el-table-column label="电话" min-width="150">
          <template #default="{ row }">
            {{ row.primaryPhone || "无" }}
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
        <el-table-column prop="note" label="备注" min-width="180" class-name="optional-column">
          <template #default="{ row }">{{ row.note || "无" }}</template>
        </el-table-column>
      </el-table>

      <div v-if="customerTotal > pageSize || currentPage > 1" class="customer-pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[20, 30, 50]"
          :total="customerTotal"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </section>

    <section class="dashboard-grid">
      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <strong>最近更新顾客</strong>
            <el-button text type="primary" @click="goCustomerList">查看列表</el-button>
          </div>
        </template>
        <el-empty v-if="!dashboard?.recentCustomers?.length" description="暂无顾客档案" />
        <el-table v-else :data="dashboard.recentCustomers" class="full-width">
          <el-table-column label="顾客" min-width="140">
            <template #default="{ row }">
              <NuxtLink class="table-link" :to="customerDetailLocation(row.id)">{{ row.name }}</NuxtLink>
            </template>
          </el-table-column>
          <el-table-column label="电话" min-width="140">
            <template #default="{ row }">{{ row.primaryPhone || "无" }}</template>
          </el-table-column>
          <el-table-column label="更新日期" width="130">
            <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <strong>最近验光记录</strong>
            <el-button text type="primary" :icon="Notebook" @click="goCustomerList">查看顾客</el-button>
          </div>
        </template>
        <el-empty v-if="!dashboard?.recentExams?.length" description="暂无验光记录" />
        <el-table v-else :data="dashboard.recentExams" class="full-width">
          <el-table-column label="顾客" min-width="140">
            <template #default="{ row }">
              <NuxtLink class="table-link" :to="customerDetailLocation(row.customer.id)">{{ row.customer.name }}</NuxtLink>
            </template>
          </el-table-column>
          <el-table-column label="电话" min-width="140">
            <template #default="{ row }">{{ row.customer.primaryPhone || "无" }}</template>
          </el-table-column>
          <el-table-column label="验光日期" width="130">
            <template #default="{ row }">{{ formatDate(row.examAt) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <el-dialog v-model="createDialogVisible" title="新增顾客" width="min(620px, calc(100vw - 32px))">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="86px">
        <el-form-item label="姓名" prop="name" required>
          <el-input v-model="createForm.name" placeholder="请输入顾客姓名" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="createForm.primaryPhone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="createForm.gender" clearable placeholder="请选择性别">
            <el-option v-for="item in genderOptions" :key="item" :label="item" :value="item" />
          </el-select>
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
