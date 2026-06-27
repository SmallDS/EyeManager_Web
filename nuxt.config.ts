export default defineNuxtConfig({
  compatibilityDate: "2026-06-26",
  css: [
    "element-plus/dist/index.css",
    "~/assets/css/main.css",
  ],
  devtools: { enabled: false },
  experimental: {
    appManifest: false,
  },
  vite: {
    optimizeDeps: {
      include: ["element-plus", "@element-plus/icons-vue"],
    },
  },
});
