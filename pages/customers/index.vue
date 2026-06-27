<script setup>
import { ElMessage } from "element-plus";
import { Plus, Search } from "@element-plus/icons-vue";

const route = useRoute();
const router = useRouter();
const query = ref(String(route.query.q || ""));
const createDialogVisible = ref(false);
const creating = ref(false);
const createFormRef = ref();
const createForm = reactive({
  name: "",
  primaryPhone: "",
  secondaryPhone: "",
  gender: "",
  note: "",
});

const { data, pending, refresh } = await useAsyncData(
  "customers",
  () => $fetch("/api/customers", { query: { q: query.value } }),
  { watch: [query] },
);

function search() {
  router.replace({ path: "/customers", query: query.value ? { q: query.value } : {} });
  refresh();
}

function resetSearch() {
  query.value = "";
  router.replace({ path: "/customers" });
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
    navigateTo(`/customers/${result.customer.id}`);
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div>
    <section class="page-head">
      <div>
        <h1>顾客档案</h1>
        <p>支持按姓名、手机号和助记码检索。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="createDialogVisible = true">新增顾客</el-button>
    </section>

    <div class="toolbar">
      <el-input
        v-model="query"
        clearable
        placeholder="搜索顾客"
        style="max-width: 420px"
        @keyup.enter="search"
      />
      <el-button type="primary" :icon="Search" @click="search">搜索</el-button>
      <el-button @click="resetSearch">清空</el-button>
    </div>

    <el-table v-loading="pending" :data="data?.customers || []" border stripe class="full-width">
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
        <template #default="{ row }">{{ row.gender || "未填" }}</template>
      </el-table-column>
      <el-table-column label="验光数" width="100">
        <template #default="{ row }">
          <el-tag>{{ row._count?.optometryExams || 0 }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" min-width="220">
        <template #default="{ row }">{{ row.note || "无" }}</template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="createDialogVisible" title="新增顾客" width="620px">
      <el-form ref="createFormRef" :model="createForm" label-width="86px">
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
