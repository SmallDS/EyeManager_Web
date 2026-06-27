import ElementPlus from "element-plus";
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from "element-plus";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide(ID_INJECTION_KEY, {
    prefix: 1024,
    current: 0,
  });
  nuxtApp.vueApp.provide(ZINDEX_INJECTION_KEY, {
    current: 0,
  });
  nuxtApp.vueApp.use(ElementPlus);

  for (const [name, component] of Object.entries(ElementPlusIconsVue)) {
    nuxtApp.vueApp.component(name, component);
  }
});
