import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance } from 'axios';
import { createAxiosInstance, createSdk, type Sdk } from 'src/infrastructure/api';
import { useAuthStore } from 'src/stores/auth';
import { useConfigStore } from 'src/stores/config';
import { useNotificationsStore } from 'src/stores/notifications';
import { getApiBaseUrl } from 'src/utils/server-endpoints';
import { version } from '../../package.json';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
    $sdk: Sdk;
  }
}

let api: AxiosInstance;
let sdk: Sdk;

const notifyVersionIncompatible = (): void => {
  const notifications = useNotificationsStore();
  notifications.notify({
    id: 'client-version-outdated',
    message: 'Client version is outdated, please update',
    level: 'warning',
    closable: false,
    group: false,
    stored: true,
  });
};

export default defineBoot(({ app, store }) => {
  const authStore = useAuthStore(store);
  const configStore = useConfigStore(store);

  api = createAxiosInstance(
    () => authStore.token,
    () => getApiBaseUrl(configStore.config.network.apiUrl),
    version,
    notifyVersionIncompatible,
  );
  sdk = createSdk(api);

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
  app.config.globalProperties.$sdk = sdk;
});

export { api, sdk };
