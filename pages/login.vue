<script setup>
import { ElMessage } from "element-plus";

definePageMeta({ layout: false });

const form = reactive({
  account: "",
  password: "",
});
const loading = ref(false);

async function login() {
  if (!form.account || !form.password) {
    ElMessage.warning("请输入账号和密码");
    return;
  }
  loading.value = true;
  try {
    await $fetch("/api/auth/login", {
      method: "POST",
      body: form,
    });
    await navigateTo("/");
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "登录失败");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <el-config-provider namespace="el">
    <main class="login-page">
      <el-card class="login-card" shadow="never">
        <template #header>
          <div>
            <h1>眼镜店管理系统</h1>
            <p>请输入后台账号和密码</p>
          </div>
        </template>
        <el-form label-position="top" @submit.prevent="login">
          <el-form-item label="账号">
            <el-input v-model="form.account" autofocus placeholder="请输入账号" @keyup.enter="login" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" show-password type="password" placeholder="请输入密码" @keyup.enter="login" />
          </el-form-item>
          <el-button type="primary" :loading="loading" class="full-width" @click="login">登录</el-button>
        </el-form>
      </el-card>
    </main>
  </el-config-provider>
</template>
