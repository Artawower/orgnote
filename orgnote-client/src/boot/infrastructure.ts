import { defineBoot } from '#q-app/wrappers';
import { debounce } from 'quasar';
import { wsClient, initWebSocketClient } from 'src/infrastructure/websocket-client';
import { api as axiosInstance } from 'src/boot/axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from 'src/stores/auth';
import { useSyncStore } from 'src/stores/sync';
import { useConfigStore } from 'src/stores/config';
import { watch } from 'vue';
import { logger } from 'src/boot/logger';

export default defineBoot(({ store }) => {
  const authStore = useAuthStore(store);
  const syncStore = useSyncStore(store);
  const configStore = useConfigStore(store);

  const debouncedSync = debounce(() => {
    logger.info('Received sync event from WebSocket');
    syncStore.sync();
  }, 1000);

  const reinitWebSocket = () => {
    console.log('[line 23]: REINIT WS');
    if (wsClient) {
      wsClient.off('sync', debouncedSync);
    }
    const client = initWebSocketClient({
      apiUrl: configStore.config.network.apiUrl,
      wsUrl: configStore.config.network.wsUrl,
    });
    console.log('✎: [line 31][infrastructure.ts] client: ', client);

    client.on('sync', debouncedSync);
    if (authStore.token) {
      client.connect(authStore.token);
    }
  };

  reinitWebSocket();

  watch(
    [() => configStore.config.network.apiUrl, () => configStore.config.network.wsUrl],
    reinitWebSocket,
  );

  const handleTokenChange = (token: string): void => {
    console.log('✎: [line 44][infrastructure.ts] token: ', token);
    console.log('✎: [line 46][infrastructure.ts] wsClient: ', wsClient);
    if (!wsClient) {
      return;
    }
    if (token) {
      wsClient.connect(token);
      return;
    }
    wsClient.disconnect();
  };

  watch(() => authStore.token, handleTokenChange, { immediate: true });

  const attachSocketIdToRequest = (
    config: InternalAxiosRequestConfig,
  ): InternalAxiosRequestConfig => {
    if (!wsClient?.socketId) {
      return config;
    }
    config.headers['X-Socket-ID'] = wsClient.socketId;
    return config;
  };

  axiosInstance.interceptors.request.use(attachSocketIdToRequest);
});
