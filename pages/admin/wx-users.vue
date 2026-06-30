<script setup>
import { ElMessage } from "element-plus";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data, pending, refresh } = await useAsyncData("admin-wx-users", () => $fetch("/api/admin/wx-users", { headers: requestHeaders }));
const savingIds = ref(new Set());
const assignments = reactive({});

watch(
  () => data.value?.wxUsers,
  (wxUsers) => {
    for (const user of wxUsers || []) {
      assignments[user.id] = user.wxUserTenants.map((item) => item.tenantId);
    }
  },
  { immediate: true },
);

async function saveAssignment(row) {
  savingIds.value = new Set([...savingIds.value, row.id]);
  try {
    await $fetch(`/api/admin/wx-users/${row.id}`, {
      method: "PUT",
      body: { tenantIds: assignments[row.id] || [] },
    });
    ElMessage.success("门店分配已保存");
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "保存失败");
  } finally {
    const next = new Set(savingIds.value);
    next.delete(row.id);
    savingIds.value = next;
  }
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString("zh-CN") : "-";
}
</script>

<template>
  <div class="stack">
    <section class="page-head">
      <div>
        <h1>小程序用户</h1>
        <p>按 OpenID 为小程序用户分配可访问门店。</p>
      </div>
    </section>

    <el-table v-loading="pending" :data="data?.wxUsers || []" border stripe class="full-width">
      <el-table-column prop="openId" label="OpenID" min-width="260" />
      <el-table-column label="分配门店" min-width="280">
        <template #default="{ row }">
          <el-select v-model="assignments[row.id]" multiple filterable placeholder="等待分配门店" class="full-width">
            <el-option v-for="tenant in data?.tenants || []" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="最近访问" width="180">
        <template #default="{ row }">{{ formatTime(row.lastSeenAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110">
        <template #default="{ row }">
          <el-button type="primary" :loading="savingIds.has(row.id)" @click="saveAssignment(row)">保存</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
