<script setup>
import { Notebook, User } from "@element-plus/icons-vue";

const { data, refresh } = await useAsyncData("dashboard", () => $fetch("/api/dashboard"));

onMounted(() => refresh());

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("zh-CN") : "-";
}
</script>

<template>
  <div>
    <section class="page-head">
      <div>
        <h1>{{ data?.tenant?.name || "默认门店" }}</h1>
        <p>多门店租户后台，当前查看默认门店数据。</p>
      </div>
      <el-button type="primary" :icon="User" @click="navigateTo('/customers')">查看顾客</el-button>
    </section>

    <section class="grid">
      <el-card shadow="never">
        <div class="metric">顾客档案</div>
        <div class="metric-value">{{ data?.customerCount ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="metric">验光记录</div>
        <div class="metric-value">{{ data?.examCount ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="metric">后台功能</div>
        <div class="metric-value">日常管理</div>
      </el-card>
    </section>

    <section class="dashboard-grid">
      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <strong>最近更新顾客</strong>
            <el-button text type="primary" :icon="User" @click="navigateTo('/customers')">全部顾客</el-button>
          </div>
        </template>
        <el-empty v-if="!data?.recentCustomers?.length" description="暂无顾客" />
        <el-table v-else :data="data.recentCustomers" border class="full-width">
          <el-table-column label="姓名" min-width="140">
            <template #default="{ row }">
              <NuxtLink class="table-link" :to="`/customers/${row.id}`">{{ row.name }}</NuxtLink>
            </template>
          </el-table-column>
          <el-table-column label="电话" min-width="140">
            <template #default="{ row }">{{ row.primaryPhone || row.secondaryPhone || "无" }}</template>
          </el-table-column>
          <el-table-column label="验光数" width="90">
            <template #default="{ row }">
              <el-tag>{{ row._count?.optometryExams || 0 }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="card-head">
            <strong>最近验光记录</strong>
            <el-button text type="primary" :icon="Notebook" @click="navigateTo('/customers')">查看</el-button>
          </div>
        </template>
        <el-empty v-if="!data?.recentExams?.length" description="暂无验光记录" />
        <el-table v-else :data="data.recentExams" border class="full-width">
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
  </div>
</template>
