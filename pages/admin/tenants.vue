<script setup>
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Edit, Plus } from "@element-plus/icons-vue";

const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data, pending, refresh } = await useAsyncData("admin-tenants", () => $fetch("/api/admin/tenants", { headers: requestHeaders }));
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref("");
const form = reactive({ name: "", code: "" });

function openCreate() {
  editingId.value = "";
  form.name = "";
  form.code = "";
  dialogVisible.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  form.name = row.name;
  form.code = row.code;
  dialogVisible.value = true;
}

async function saveTenant() {
  saving.value = true;
  try {
    const url = editingId.value ? `/api/admin/tenants/${editingId.value}` : "/api/admin/tenants";
    await $fetch(url, {
      method: editingId.value ? "PUT" : "POST",
      body: form,
    });
    ElMessage.success("门店已保存");
    dialogVisible.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function deleteTenant(row) {
  await ElMessageBox.confirm(`确定删除门店「${row.name}」？有关联数据或分配关系时系统会拒绝删除。`, "删除门店", {
    type: "warning",
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  });
  try {
    await $fetch(`/api/admin/tenants/${row.id}`, { method: "DELETE" });
    ElMessage.success("门店已删除");
    await refresh();
  } catch (error) {
    ElMessage.error(error?.data?.message || error?.data?.statusMessage || "删除失败");
  }
}
</script>

<template>
  <div class="stack">
    <section class="page-head">
      <div>
        <h1>门店管理</h1>
        <p>创建、编辑和删除系统门店。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增门店</el-button>
    </section>

    <el-table v-loading="pending" :data="data?.tenants || []" border stripe class="full-width">
      <el-table-column prop="name" label="门店名称" min-width="160" />
      <el-table-column prop="code" label="门店编码" min-width="140" />
      <el-table-column label="关联数据" min-width="240">
        <template #default="{ row }">
          顾客 {{ row._count.customers }} / 验光 {{ row._count.optometryExams }} / 员工 {{ row._count.userTenants }} / 小程序 {{ row._count.wxUserTenants }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button text type="danger" :icon="Delete" @click="deleteTenant(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑门店' : '新增门店'" width="520px">
      <el-form :model="form" label-width="86px">
        <el-form-item label="门店名称" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="门店编码" required>
          <el-input v-model="form.code" placeholder="仅支持字母、数字、下划线和短横线" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveTenant">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
