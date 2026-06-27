<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Upload } from "@element-plus/icons-vue";

const importing = ref(false);
const clearing = ref(false);
const customerFile = ref(null);
const optometryFile = ref(null);
const customerFileList = ref([]);
const optometryFileList = ref([]);
const clearBeforeImport = ref(false);
const confirmation = ref("");
const adminApiKey = ref("");
let pollTimer;
const { data, pending, refresh } = await useAsyncData("imports", () => $fetch("/api/imports"));

const canImport = computed(() => {
  if (!customerFile.value || !optometryFile.value) return false;
  return !clearBeforeImport.value || confirmation.value === "清空数据";
});

function errorMessage(error) {
  return error?.data?.statusMessage || error?.statusMessage || error?.message || "操作失败";
}

function setCustomerFile(uploadFile, uploadFiles) {
  const latest = uploadFiles.slice(-1);
  customerFileList.value = latest;
  customerFile.value = latest[0]?.raw || null;
}

function setOptometryFile(uploadFile, uploadFiles) {
  const latest = uploadFiles.slice(-1);
  optometryFileList.value = latest;
  optometryFile.value = latest[0]?.raw || null;
}

function removeCustomerFile() {
  customerFile.value = null;
  customerFileList.value = [];
}

function removeOptometryFile() {
  optometryFile.value = null;
  optometryFileList.value = [];
}

function replaceCustomerFile(files) {
  const file = files[0];
  customerFile.value = file || null;
  customerFileList.value = file ? [{ name: file.name, raw: file }] : [];
}

function replaceOptometryFile(files) {
  const file = files[0];
  optometryFile.value = file || null;
  optometryFileList.value = file ? [{ name: file.name, raw: file }] : [];
}

function headers() {
  return adminApiKey.value ? { "x-api-key": adminApiKey.value } : {};
}

function hasRunningImport() {
  return data.value?.batches?.some((batch) => batch.status === "RUNNING");
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

async function runImport() {
  if (!customerFile.value || !optometryFile.value) {
    ElMessage.warning("请先选择顾客 CSV 和验光 CSV");
    return;
  }

  if (clearBeforeImport.value && confirmation.value !== "清空数据") {
    ElMessage.warning("请输入确认词：清空数据");
    return;
  }

  importing.value = true;
  try {
    const formData = new FormData();
    formData.append("customerFile", customerFile.value, customerFile.value.name);
    formData.append("optometryFile", optometryFile.value, optometryFile.value.name);
    formData.append("clearBeforeImport", String(clearBeforeImport.value));
    formData.append("confirmation", confirmation.value);

    const result = await $fetch("/api/imports", {
      method: "POST",
      headers: headers(),
      body: formData,
    });
    ElMessage.success(result?.message || "导入任务已开始");
    await refresh();
    scheduleImportPolling();
  } catch (error) {
    ElMessage.error(errorMessage(error));
  } finally {
    importing.value = false;
  }
}

async function clearBusinessData() {
  let value;
  try {
    value = await ElMessageBox.prompt("该操作会删除所有顾客、验光记录和导入报告。请输入“清空数据”继续。", "清空业务数据", {
      confirmButtonText: "确认清空",
      cancelButtonText: "取消",
      inputPlaceholder: "清空数据",
      inputValidator: (input) => input === "清空数据" || "请输入：清空数据",
      type: "warning",
    });
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
    await refresh();
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
        <p>低频维护功能：选择顾客 CSV 和验光 CSV 后上传导入。</p>
      </div>
    </section>

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
        <el-form-item label="管理 API Key">
          <el-input v-model="adminApiKey" show-password placeholder="如后端配置 ADMIN_API_KEY，请填写" style="max-width: 360px" />
        </el-form-item>
        <el-form-item label="重导选项">
          <el-checkbox v-model="clearBeforeImport">导入前清空业务数据</el-checkbox>
        </el-form-item>
        <el-form-item v-if="clearBeforeImport" label="确认词" required>
          <el-input v-model="confirmation" placeholder="请输入：清空数据" style="max-width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Upload" :loading="importing" :disabled="!canImport" @click="runImport">上传并开始导入</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-head">
          <strong>清空业务数据</strong>
          <el-tag type="danger">危险操作</el-tag>
        </div>
      </template>
      <p class="muted">清空顾客、验光记录、导入批次和导入问题，保留门店和用户配置。</p>
      <el-button type="danger" plain :icon="Delete" :loading="clearing" @click="clearBusinessData">清空业务数据</el-button>
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
