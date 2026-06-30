<script setup>
import { ElMessage } from "element-plus";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data, refresh } = await useAsyncData("wechat-settings", () => $fetch("/api/admin/settings/wechat", { headers: requestHeaders }));
const saving = ref(false);
const form = reactive({
  appId: "",
  secret: "",
});

watch(
  () => data.value,
  (settings) => {
    form.appId = settings?.appId || "";
    form.secret = "";
  },
  { immediate: true },
);

async function saveSettings() {
  saving.value = true;
  try {
    await $fetch("/api/admin/settings/wechat", {
      method: "PUT",
      body: form,
    });
    ElMessage.success("微信配置已保存");
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "保存失败");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="stack">
    <section class="page-head">
      <div>
        <h1>系统设置</h1>
        <p>维护小程序登录所需微信配置。</p>
      </div>
    </section>

    <el-card shadow="never">
      <template #header><strong>微信小程序</strong></template>
      <el-form :model="form" label-width="120px" style="max-width: 680px">
        <el-form-item label="APPID" required>
          <el-input v-model="form.appId" placeholder="请输入微信小程序 APPID" />
        </el-form-item>
        <el-form-item label="SECRET">
          <el-input v-model="form.secret" show-password type="password" placeholder="不填写则保持现有 SECRET" />
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag :type="data?.secretConfigured ? 'success' : 'warning'">
            {{ data?.secretConfigured ? `已配置 ${data.secretMasked}` : "未配置 SECRET" }}
          </el-tag>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="saveSettings">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
