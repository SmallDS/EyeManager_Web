<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Plus } from "@element-plus/icons-vue";

const route = useRoute();
const customerId = computed(() => String(route.params.id));
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const pageSizeOptions = [20, 30, 50];

const { data, pending, refresh } = await useAsyncData(
  () => `customer-${customerId.value}`,
  () => $fetch(`/api/customers/${customerId.value}`, { headers: requestHeaders }),
  { watch: [customerId] },
);

const form = reactive({
  name: "",
  primaryPhone: "",
  gender: "",
  note: "",
});
const activeExamIds = ref([]);
const savingCustomer = ref(false);
const creatingExam = ref(false);
const customerListLocation = computed(() => ({
  path: "/",
  query: getListQueryFromRoute(),
  hash: "#customers",
}));

watch(
  () => data.value?.customer,
  (customer) => {
    if (!customer) return;
    form.name = customer.name || "";
    form.primaryPhone = customer.primaryPhone || "";
    form.gender = customer.gender || "";
    form.note = customer.note || "";
    activeExamIds.value = customer.optometryExams?.[0]?.id ? [customer.optometryExams[0].id] : [];
  },
  { immediate: true },
);

function formatExamDate(value) {
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getQueryValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getPositiveNumber(value) {
  const number = Number.parseInt(getQueryValue(value), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getListQueryFromRoute() {
  const query = {};
  const q = getQueryValue(route.query.q).trim();
  const page = getPositiveNumber(route.query.page);
  const pageSize = getPositiveNumber(route.query.pageSize);

  if (q) query.q = q;
  if (page) query.page = String(page);
  if (pageSizeOptions.includes(pageSize)) query.pageSize = String(pageSize);
  return query;
}

async function goCustomerList() {
  await navigateTo(customerListLocation.value);
}

async function saveCustomer() {
  savingCustomer.value = true;
  try {
    await $fetch(`/api/customers/${customerId.value}`, {
      method: "PUT",
      body: form,
    });
    ElMessage.success("顾客信息已保存");
    await refresh();
  } finally {
    savingCustomer.value = false;
  }
}

async function deleteCustomer() {
  await ElMessageBox.confirm("删除顾客会同时删除其验光记录，确定继续？", "确认删除", {
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
    type: "warning",
  });
  await $fetch(`/api/customers/${customerId.value}`, { method: "DELETE" });
  ElMessage.success("顾客已删除");
  await goCustomerList();
}

async function createExam() {
  creatingExam.value = true;
  try {
    const result = await $fetch(`/api/customers/${customerId.value}/exams`, { method: "POST" });
    ElMessage.success("验光单已新增");
    await refresh();
    activeExamIds.value = [result.exam.id];
  } finally {
    creatingExam.value = false;
  }
}

async function saveExam({ id, payload }) {
  await $fetch(`/api/optometry/${id}`, {
    method: "PUT",
    body: payload,
  });
  ElMessage.success("验光单已保存");
  await refresh();
}

async function deleteExam(id) {
  await ElMessageBox.confirm("确定删除这张验光单？", "确认删除", {
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
    type: "warning",
  });
  await $fetch(`/api/optometry/${id}`, { method: "DELETE" });
  ElMessage.success("验光单已删除");
  await refresh();
}
</script>

<template>
  <div v-loading="pending" class="stack">
    <section class="page-head">
      <div>
        <h1>{{ data?.customer?.name || "顾客详情" }}</h1>
        <p>{{ data?.customer?.primaryPhone || "暂无电话" }}</p>
      </div>
      <div class="action-row">
        <el-button type="primary" :icon="Plus" :loading="creatingExam" @click="createExam">新增验光单</el-button>
        <el-button @click="goCustomerList">返回列表</el-button>
      </div>
    </section>

    <el-card shadow="never">
      <template #header>
        <div class="action-row">
          <strong>基本信息</strong>
          <div class="action-row">
            <el-button type="danger" plain :icon="Delete" @click="deleteCustomer">删除顾客</el-button>
            <el-button type="primary" :loading="savingCustomer" @click="saveCustomer">保存顾客</el-button>
          </div>
        </div>
      </template>
      <el-form :model="form" label-width="86px">
        <el-row :gutter="14">
          <el-col :xs="24" :md="6">
            <el-form-item label="姓名">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="6">
            <el-form-item label="电话">
              <el-input v-model="form.primaryPhone" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="6">
            <el-form-item label="性别">
              <el-input v-model="form.gender" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="顾客备注">
          <el-input v-model="form.note" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-empty v-if="!data?.customer?.optometryExams?.length" description="暂无验光记录" />
    <el-collapse v-else v-model="activeExamIds" class="exam-collapse">
      <el-collapse-item
        v-for="(exam, index) in data.customer.optometryExams"
        :key="exam.id"
        :name="exam.id"
      >
        <template #title>
          <div class="exam-title">
            <span>{{ formatExamDate(exam.examAt) }}</span>
            <el-tag v-if="index === 0" type="success">最新记录</el-tag>
          </div>
        </template>
        <PrescriptionSheet :customer="data.customer" :exam="exam" @save="saveExam" @delete="deleteExam" />
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
