import { defineAsyncComponent } from 'vue';

export const FileManagerRef = defineAsyncComponent(() => import('./FileManager.vue'));

export const FILE_MANAGER_SIDEBAR_CONFIG = {
  componentProps: {
    closable: false,
    tree: true,
    compact: true,
  },
} as const;
