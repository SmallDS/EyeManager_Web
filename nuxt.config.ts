export default defineNuxtConfig({
  compatibilityDate: "2026-06-26",
  css: [
    "element-plus/dist/index.css",
    "element-plus/theme-chalk/dark/css-vars.css",
    "~/assets/css/main.css",
  ],
  devtools: { enabled: false },
  experimental: {
    appManifest: false,
  },
  build: {
    transpile: ["element-plus"],
  },
  vite: {
    optimizeDeps: {
      include: ["dayjs", "dayjs/plugin/*", "element-plus", "@element-plus/icons-vue"],
    },
  },
});
