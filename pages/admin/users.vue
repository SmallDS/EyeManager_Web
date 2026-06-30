<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus } from "@element-plus/icons-vue";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data, pending, refresh } = await useAsyncData("admin-users", () => $fetch("/api/admin/users", { headers: requestHeaders }));
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({
  account: "",
  name: "",
  mobile: "",
  email: "",
  role: "STAFF",
  password: "",
  tenantIds: [],
});

function resetForm() {
  editingId.value = "";
  form.account = "";
  form.name = "";
  form.mobile = "";
  form.email = "";
  form.role = "STAFF";
  form.password = "";
  form.tenantIds = [];
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.account = row.account;
  form.name = row.name;
  form.mobile = row.mobile || "";
  form.email = row.email || "";
  form.role = row.role === "ADMIN" || row.role === "OWNER" ? "ADMIN" : "STAFF";
  form.password = "";
  form.tenantIds = row.userTenants.map((item) => item.tenantId);
  dialogVisible.value = true;
}

async function saveUser() {
  saving.value = true;
  try {
    const url = editingId.value ? `/api/admin/users/${editingId.value}` : "/api/admin/users";
    await $fetch(url, {
      method: editingId.value ? "PUT" : "POST",
      body: form,
    });
    ElMessage.success("账号已保存");
    dialogVisible.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function deleteUser(row) {
  await ElMessageBox.confirm(`确定删除账号「${row.account}」？`, "删除账号", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  });
  try {
    await $fetch(`/api/admin/users/${row.id}`, { method: "DELETE" });
    ElMessage.success("账号已删除");
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "删除失败");
  }
}

function roleName(role) {
  return role === "ADMIN" || role === "OWNER" ? "管理员" : "员工";
}
</script>

<template>
  <div class="stack">
    <section class="page-head">
      <div>
        <h1>员工管理</h1>
        <p>维护后台账号、角色和门店分配。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增账号</el-button>
    </section>

    <el-table v-loading="pending" :data="data?.users || []" border stripe class="full-width">
      <el-table-column prop="account" label="账号" min-width="140" />
      <el-table-column prop="name" label="姓名" min-width="120" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="roleName(row.role) === '管理员' ? 'danger' : 'info'">{{ roleName(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分配门店" min-width="220">
        <template #default="{ row }">
          <span v-if="roleName(row.role) === '管理员'">全部门店</span>
          <span v-else>{{ row.userTenants.map((item) => item.tenant.name).join("、") || "未分配" }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" :icon="Delete" @click="deleteUser(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑账号' : '新增账号'" width="620px">
      <el-form :model="form" label-width="86px">
        <el-form-item label="账号" required>
          <el-input v-model="form.account" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role">
            <el-radio-button label="STAFF">员工</el-radio-button>
            <el-radio-button label="ADMIN">管理员</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分配门店" :required="form.role === 'STAFF'">
          <el-select v-model="form.tenantIds" multiple filterable placeholder="选择门店" class="full-width">
            <el-option v-for="tenant in data?.tenants || []" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.mobile" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item :label="editingId ? '重置密码' : '密码'" :required="!editingId">
          <el-input v-model="form.password" show-password type="password" :placeholder="editingId ? '不填写则保持不变' : '请输入初始密码'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
