<template>
  <el-config-provider namespace="el">
    <div class="shell">
      <header class="topbar">
        <NuxtLink class="brand" to="/">眼镜店管理系统</NuxtLink>
        <nav class="nav" aria-label="主导航">
          <NuxtLink to="/customers">顾客</NuxtLink>
          <NuxtLink to="/imports">导入</NuxtLink>
        </nav>
      </header>
      <main class="main">
        <NuxtPage />
      </main>
    </div>
  </el-config-provider>
</template>

