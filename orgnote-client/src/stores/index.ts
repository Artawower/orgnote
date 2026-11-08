import { defineStore } from '@quasar/app-vite/wrappers';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import type { OrgNoteApi } from 'orgnote-api';
import { createPinia } from 'pinia';

declare module 'pinia' {
  export interface PiniaCustomProperties {
    readonly api: OrgNoteApi;
  }
}

export default defineStore(({ ssrContext }) => {
  const pinia = createPinia();

  if (!ssrContext) {
    pinia.use(piniaPluginPersistedstate);
  }

  return pinia;
});
