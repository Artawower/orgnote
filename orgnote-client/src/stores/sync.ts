import { ref, computed } from 'vue';
import type { SyncPlan, SyncStateData, FileSystem, SyncStore } from 'orgnote-api';
import {
  createSyncPlan,
  I18N,
  InvalidSyncResponseError,
  recoverState,
} from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { sdk } from 'src/boot/axios';
import { createSyncState } from 'src/utils/sync-state';
import { to } from 'orgnote-api/utils';
import { enqueuePlanOperations, isPlanEmpty } from 'src/infrastructure/sync';
import { useFileSystemManagerStore } from './file-system-manager';
import { api } from 'src/boot/api';
import { withCoalescing } from 'src/utils/with-coalescing';
import axios from 'axios';
import { i18n } from 'src/boot/i18n';
import { recordConfigPlanEvent } from 'src/infrastructure/config/config-lifecycle-record';
import { defineStorageBoundStore } from 'src/infrastructure/stores/storage-bound-store';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';
import { useServerEnvironmentStore } from './server-environment';

const httpUpgradeRequired = 426;
const rootPath = '/';
const contentHashCheckEnabled = true;
const invalidSyncResponseNotificationId = 'sync-invalid-api-response';

export const useSyncStore = defineStorageBoundStore<'sync', SyncStore>(
  'sync',
  () => {
    const currentPlan = ref<SyncPlan | null>(null);
    const stateData = ref<SyncStateData | null>({ files: {} });
    const isVersionIncompatible = ref(false);

    const state = createSyncState(stateData);
    const fs = computed(() => useFileSystemManagerStore().currentFs as FileSystem);

    const isSyncProhibited = (): boolean => {
      const authStore = api.core.useAuth();
      const configStore = api.core.useConfig();
      const serverEnvironment = useServerEnvironmentStore();
      return (
        isVersionIncompatible.value ||
        !canUseRemoteAccountFeatures(authStore.user, serverEnvironment.isSelfHosted) ||
        configStore.config.synchronization.type === 'none'
      );
    };

    const isVersionError = (error: Error): boolean => {
      return axios.isAxiosError(error) && error.response?.status === httpUpgradeRequired;
    };

    const reportInvalidSyncResponse = (error: InvalidSyncResponseError): null => {
      reporter.reportError(error, {
        id: invalidSyncResponseNotificationId,
        message: i18n.global.t(I18N.SYNC_INVALID_API_RESPONSE),
        stored: true,
      });
      return null;
    };

    const handleSyncError = (error: Error): null => {
      if (isVersionError(error)) {
        isVersionIncompatible.value = true;
        return null;
      }

      if (error instanceof InvalidSyncResponseError) {
        return reportInvalidSyncResponse(error);
      }

      reporter.reportError(error);
      return null;
    };

    const createPlanAction = async (): Promise<SyncPlan | null> => {
      const recoverResult = await to(recoverState)(state);
      if (recoverResult.isErr()) return handleSyncError(recoverResult.error);

      const planResult = await to(createSyncPlan)({
        fs: fs.value,
        api: sdk.sync,
        state,
        rootPath: rootPath,
        enableContentHashCheck: contentHashCheckEnabled,
      });
      if (planResult.isErr()) return handleSyncError(planResult.error);

      recordConfigPlanEvent(planResult.value);
      currentPlan.value = planResult.value;
      return planResult.value;
    };

    const executePlan = async (plan: SyncPlan): Promise<void> => {
      const result = await to(enqueuePlanOperations)(plan);
      currentPlan.value = null;
      if (result.isErr()) throw result.error;
    };

    const getInvalidatedPaths = (): Set<string> =>
      new Set(
        Object.entries(stateData.value?.files ?? {})
          .filter(([, file]) => !file.syncedAt)
          .map(([path]) => path),
      );

    const runSyncIteration = async (): Promise<boolean> => {
      const invalidatedBefore = getInvalidatedPaths();
      const plan = await createPlanAction();
      if (!plan || isPlanEmpty(plan)) return false;

      const result = await to(executePlan)(plan);
      if (result.isErr()) {
        handleSyncError(result.error);
        return false;
      }
      return [...getInvalidatedPaths()].some((path) => !invalidatedBefore.has(path));
    };

    const runSyncCycle = async (): Promise<void> => {
      if (isSyncProhibited()) return;
      if (await runSyncIteration()) await runSyncIteration();
    };

    const sync = withCoalescing(runSyncCycle);

    const reset = async (): Promise<void> => {
      await state.clear();
      currentPlan.value = null;
    };

    return {
      currentPlan,
      stateData,
      createPlan: createPlanAction,
      executePlan,
      sync,
      reset,
      $resetStorage: reset,
    };
  },
  {
    persist: {
      pick: ['stateData'],
    },
  },
);
