import { defineStore } from 'pinia';
import { computed, ref, watch, type WatchStopHandle } from 'vue';
import type { ModelsEnvironmentInfo } from 'orgnote-api/remote-api';
import { to } from 'orgnote-api/utils';
import { version } from '../../package.json';
import { sdk } from 'src/boot/axios';
import { getApiBaseUrl } from 'src/utils/server-endpoints';
import { useConfigStore } from './config';

interface EnvironmentDetection {
  apiUrl: string;
  environment: ModelsEnvironmentInfo | null;
}

export const useServerEnvironmentStore = defineStore('server-environment', () => {
  const detection = ref<EnvironmentDetection | null>(null);
  const activeApiUrl = ref('');
  const loading = ref(false);
  let requestGeneration = 0;
  let stopWatching: WatchStopHandle | null = null;

  const configuredApiUrl = (): string =>
    getApiBaseUrl(useConfigStore().config.network.apiUrl);
  const environment = computed(() =>
    detection.value?.apiUrl === activeApiUrl.value ? detection.value.environment : null,
  );
  const isSelfHosted = computed(() => environment.value?.selfHosted === true);

  const load = async (): Promise<void> => {
    const apiUrl = configuredApiUrl();
    activeApiUrl.value = apiUrl;
    if (detection.value?.apiUrl === apiUrl) return;

    const generation = ++requestGeneration;
    detection.value = null;
    loading.value = true;
    const result = await to(sdk.systemInfo.systemInfoVersionGet)(version);
    if (generation !== requestGeneration) return;

    loading.value = false;
    if (apiUrl !== configuredApiUrl()) return;
    if (result.isErr()) return;
    detection.value = { apiUrl, environment: result.value.data.environment ?? null };
  };

  const watchServerChanges = (): void => {
    if (stopWatching) return;
    stopWatching = watch(
      configuredApiUrl,
      (apiUrl) => {
        activeApiUrl.value = apiUrl;
        void load();
      },
      { flush: 'sync' },
    );
  };

  return {
    apiUrl: activeApiUrl,
    environment,
    loading,
    isSelfHosted,
    load,
    watchServerChanges,
  };
});
