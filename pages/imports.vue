<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Upload } from "@element-plus/icons-vue";

const importing = ref(false);
const previewing = ref(false);
const clearing = ref(false);
const customerFile = ref(null);
const optometryFile = ref(null);
const customerFileList = ref([]);
const optometryFileList = ref([]);
const clearBeforeImport = ref(false);
const confirmation = ref("");
const previewResult = ref(null);
const previewConfirmed = ref(false);
const previewIssueLevel = ref("ALL");
let pollTimer;
const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data, pending, refresh } = await useAsyncData("imports", () => $fetch("/api/imports", { headers: requestHeaders }));
const { data: dashboard, refresh: refreshDashboard } = await useAsyncData(
  "imports-dashboard",
  () => $fetch("/api/dashboard", { headers: requestHeaders }),
);

const runningImport = computed(() => data.value?.batches?.some((batch) => batch.status === "RUNNING"));

const canPreview = computed(() => {
  if (runningImport.value) return false;
  return Boolean(customerFile.value && optometryFile.value);
});

const canImport = computed(() => {
  if (runningImport.value || !previewConfirmed.value) return false;
  if (!customerFile.value || !optometryFile.value) return false;
  return !clearBeforeImport.value || confirmation.value === "清空数据";
});

const previewIssues = computed(() => {
  const issues = previewResult.value?.firstIssues || [];
  if (previewIssueLevel.value === "ALL") return issues;
  return issues.filter((issue) => issue.level === previewIssueLevel.value);
});

function errorMessage(error) {
  return error?.data?.message || error?.data?.statusMessage || error?.message || error?.statusMessage || "操作失败";
}

function resetPreview() {
  previewResult.value = null;
  previewConfirmed.value = false;
  previewIssueLevel.value = "ALL";
}

function setCustomerFile(uploadFile, uploadFiles) {
  const latest = uploadFiles.slice(-1);
  customerFileList.value = latest;
  customerFile.value = latest[0]?.raw || null;
  resetPreview();
}

function setOptometryFile(uploadFile, uploadFiles) {
  const latest = uploadFiles.slice(-1);
  optometryFileList.value = latest;
  optometryFile.value = latest[0]?.raw || null;
  resetPreview();
}

function removeCustomerFile() {
  customerFile.value = null;
  customerFileList.value = [];
  resetPreview();
}

function removeOptometryFile() {
  optometryFile.value = null;
  optometryFileList.value = [];
  resetPreview();
}

function replaceCustomerFile(files) {
  const file = files[0];
  customerFile.value = file || null;
  customerFileList.value = file ? [{ name: file.name, raw: file }] : [];
  resetPreview();
}

function replaceOptometryFile(files) {
  const file = files[0];
  optometryFile.value = file || null;
  optometryFileList.value = file ? [{ name: file.name, raw: file }] : [];
  resetPreview();
}

function hasRunningImport() {
  return runningImport.value;
}

function scheduleImportPolling() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    await refresh();
    if (hasRunningImport()) {
      scheduleImportPolling();
    }
  }, 2500);
}

onMounted(() => {
  if (hasRunningImport()) {
    scheduleImportPolling();
  }
});

onBeforeUnmount(() => {
  clearTimeout(pollTimer);
});

function buildImportFormData() {
  const formData = new FormData();
  formData.append("customerFile", customerFile.value, customerFile.value.name);
  formData.append("optometryFile", optometryFile.value, optometryFile.value.name);
  return formData;
}

async function previewImport() {
  if (!customerFile.value || !optometryFile.value) {
    ElMessage.warning("请先选择顾客 CSV 和验光 CSV");
    return;
  }

  if (hasRunningImport()) {
    ElMessage.warning("当前门店已有导入任务运行中，请完成后再操作");
    return;
  }

  previewing.value = true;
  try {
    const result = await $fetch("/api/imports/preview", {
      method: "POST",
      body: buildImportFormData(),
    });
    previewResult.value = result.preview;
    previewConfirmed.value = false;
    ElMessage.success("导入预检完成");
  } catch (error) {
    resetPreview();
    ElMessage.error(errorMessage(error));
  } finally {
    previewing.value = false;
  }
}

async function runImport() {
  if (!customerFile.value || !optometryFile.value) {
    ElMessage.warning("请先选择顾客 CSV 和验光 CSV");
    return;
  }

  if (!previewConfirmed.value) {
    ElMessage.warning("请先完成导入预检并确认结果");
    return;
  }

  if (hasRunningImport()) {
    ElMessage.warning("当前门店已有导入任务运行中，请完成后再操作");
    return;
  }

  if (clearBeforeImport.value && confirmation.value !== "清空数据") {
    ElMessage.warning("请输入确认词：清空数据");
    return;
  }

  importing.value = true;
  try {
    const formData = buildImportFormData();
    formData.append("clearBeforeImport", String(clearBeforeImport.value));
    formData.append("confirmation", confirmation.value);
    formData.append("previewConfirmed", String(previewConfirmed.value));

    const result = await $fetch("/api/imports", {
      method: "POST",
      body: formData,
    });
    ElMessage.success(result?.message || "导入任务已开始");
    resetPreview();
    await refresh();
    await refreshDashboard();
    scheduleImportPolling();
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    importing.value = false;
  }
}

async function clearBusinessData() {
  if (hasRunningImport()) {
    ElMessage.warning("当前门店已有导入任务运行中，请完成后再清空数据");
    return;
  }

  let value;
  const tenantName = dashboard.value?.tenant?.name || data.value?.tenant?.name || "当前门店";
  const customerCount = dashboard.value?.customerCount ?? 0;
  const examCount = dashboard.value?.examCount ?? 0;
  try {
    value = await ElMessageBox.prompt(
      `该操作会删除 ${tenantName} 的 ${customerCount} 位顾客、${examCount} 条验光记录和导入报告。请输入“清空数据”继续。`,
      "清空业务数据",
      {
        confirmButtonText: "确认清空",
        cancelButtonText: "取消",
        inputPlaceholder: "清空数据",
        inputValidator: (input) => input === "清空数据" || "请输入：清空数据",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  clearing.value = true;
  try {
    await $fetch("/api/admin/business-data", {
      method: "DELETE",
      body: { confirmation: value.value },
    });
    ElMessage.success("业务数据已清空");
    resetPreview();
    await refresh();
    await refreshDashboard();
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    clearing.value = false;
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
        <h1>数据导入</h1>
        <p>先预检 CSV，再确认写入当前门店数据。</p>
      </div>
    </section>

    <el-alert
      v-if="runningImport"
      title="当前门店已有导入任务运行中，完成前不能再次导入或清空业务数据。"
      type="warning"
      show-icon
      :closable="false"
    />

    <el-card shadow="never">
      <template #header><strong>上传 CSV 导入</strong></template>
      <el-form label-width="120px">
        <el-form-item label="顾客 CSV" required>
          <el-upload
            v-model:file-list="customerFileList"
            accept=".csv,text/csv"
            :auto-upload="false"
            :limit="1"
            :on-change="setCustomerFile"
            :on-exceed="replaceCustomerFile"
            :on-remove="removeCustomerFile"
          >
            <el-button :icon="Upload">选择顾客文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="验光 CSV" required>
          <el-upload
            v-model:file-list="optometryFileList"
            accept=".csv,text/csv"
            :auto-upload="false"
            :limit="1"
            :on-change="setOptometryFile"
            :on-exceed="replaceOptometryFile"
            :on-remove="removeOptometryFile"
          >
            <el-button :icon="Upload">选择验光文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="重导选项">
          <el-checkbox v-model="clearBeforeImport">导入前清空业务数据</el-checkbox>
        </el-form-item>
        <el-form-item v-if="clearBeforeImport" label="确认词" required>
          <el-input v-model="confirmation" placeholder="请输入：清空数据" style="max-width: 240px" />
        </el-form-item>
        <el-form-item v-if="previewResult" label="预检确认" required>
          <el-checkbox v-model="previewConfirmed">我已确认预检结果，继续正式导入</el-checkbox>
        </el-form-item>
        <el-form-item>
          <div class="action-row">
            <el-button :icon="Upload" :loading="previewing" :disabled="!canPreview" @click="previewImport">预检 CSV</el-button>
            <el-button type="primary" :icon="Upload" :loading="importing" :disabled="!canImport" @click="runImport">确认并开始导入</el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="previewResult" shadow="never">
      <template #header>
        <div class="card-head">
          <strong>导入预检结果</strong>
          <el-tag :type="previewResult.errorCount ? 'danger' : (previewResult.warningCount ? 'warning' : 'success')">
            {{ previewResult.warningCount }} 警告 / {{ previewResult.errorCount }} 错误
          </el-tag>
        </div>
      </template>
      <section class="grid">
        <div>
          <div class="metric">顾客行数</div>
          <div class="metric-value">{{ previewResult.importedCustomers }}/{{ previewResult.customerRows }}</div>
        </div>
        <div>
          <div class="metric">验光行数</div>
          <div class="metric-value">{{ previewResult.importedOptometry }}/{{ previewResult.optometryRows }}</div>
        </div>
        <div>
          <div class="metric">跳过验光</div>
          <div class="metric-value">{{ previewResult.skippedOptometry }}</div>
        </div>
      </section>
      <div v-if="previewResult.firstIssues?.length" class="stack form-card">
        <el-radio-group v-model="previewIssueLevel" size="small">
          <el-radio-button label="ALL">全部</el-radio-button>
          <el-radio-button label="WARNING">警告</el-radio-button>
          <el-radio-button label="ERROR">错误</el-radio-button>
        </el-radio-group>
        <div
          v-for="issue in previewIssues"
          :key="`${issue.level}-${issue.entity}-${issue.rowNumber}-${issue.message}`"
          :class="issue.level === 'ERROR' ? 'issue-error' : 'issue-warning'"
        >
          <el-tag size="small" :type="issue.level === 'ERROR' ? 'danger' : 'warning'">{{ issue.level }}</el-tag>
          第 {{ issue.rowNumber || "-" }} 行 {{ issue.sourceId || "" }}: {{ issue.message }}
        </div>
      </div>
      <el-empty v-else description="未发现导入问题" />
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-head">
          <strong>清空业务数据</strong>
          <el-tag type="danger">危险操作</el-tag>
        </div>
      </template>
      <p class="muted">清空顾客、验光记录、导入批次和导入问题，保留门店和用户配置。</p>
      <el-button type="danger" plain :icon="Delete" :loading="clearing" :disabled="runningImport" @click="clearBusinessData">清空业务数据</el-button>
    </el-card>

    <el-table v-loading="pending" :data="data?.batches || []" border stripe class="full-width">
      <el-table-column prop="customerFile" label="顾客文件" min-width="160" />
      <el-table-column prop="optometryFile" label="验光文件" min-width="160" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column label="顾客" width="130">
        <template #default="{ row }">{{ row.importedCustomers }}/{{ row.customerRows }}</template>
      </el-table-column>
      <el-table-column label="验光" width="130">
        <template #default="{ row }">{{ row.importedOptometry }}/{{ row.optometryRows }}</template>
      </el-table-column>
      <el-table-column prop="skippedOptometry" label="跳过" width="100" />
      <el-table-column label="警告/错误" width="120">
        <template #default="{ row }">{{ row.warningCount }}/{{ row.errorCount }}</template>
      </el-table-column>
      <el-table-column label="时间" min-width="180">
        <template #default="{ row }">{{ formatTime(row.startedAt) }}</template>
      </el-table-column>
    </el-table>

    <el-card v-if="data?.batches?.[0]?.issues?.length" shadow="never">
      <template #header><strong>最近导入问题</strong></template>
      <div class="stack">
        <div
          v-for="issue in data.batches[0].issues"
          :key="issue.id"
          :class="issue.level === 'ERROR' ? 'issue-error' : 'issue-warning'"
        >
          第 {{ issue.rowNumber || "-" }} 行 {{ issue.sourceId || "" }}: {{ issue.message }}
        </div>
      </div>
    </el-card>
  </div>
</template>
