import { watch, type WatchStopHandle, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { api } from 'src/boot/api';
import { reporter } from 'src/boot/report';
import { to } from 'orgnote-api/utils';
import { runPostActivationSync } from './post-activation-sync';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import {
  canUseRemoteAccountFeatures,
  type CapabilityUser,
} from 'src/utils/server-capabilities';

type User = CapabilityUser | null | undefined;

export interface UseAutoSyncDeps {
  userRef: Ref<User>;
  isSelfHostedRef: Ref<boolean>;
  sync: () => Promise<void>;
  onError: (error: unknown) => void;
}

const getDefaultDeps = (): UseAutoSyncDeps => {
  const authStore = api.core.useAuth();
  const { user } = storeToRefs(authStore);
  const { isSelfHosted } = storeToRefs(useServerEnvironmentStore());

  return {
    userRef: user as Ref<User>,
    isSelfHostedRef: isSelfHosted,
    sync: runPostActivationSync,
    onError: reporter.reportWarning,
  };
};

export const useAutoSync = (deps?: UseAutoSyncDeps): WatchStopHandle => {
  const { userRef, isSelfHostedRef, sync, onError } = deps ?? getDefaultDeps();

  return watch(
    () => canUseRemoteAccountFeatures(userRef.value, isSelfHostedRef.value),
    async (canUseRemoteFeatures, couldUseRemoteFeatures) => {
      if (couldUseRemoteFeatures || !canUseRemoteFeatures) return;

      const result = await to(sync)();
      if (result.isErr()) onError(result.error);
    },
  );
};
