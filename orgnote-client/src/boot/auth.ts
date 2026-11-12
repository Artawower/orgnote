import { defineBoot } from '@quasar/app-vite/wrappers';
import { api } from './api';
import { useAutoSync } from 'src/composables/use-auto-sync';
import { runPostActivationSync } from 'src/composables/post-activation-sync';
import { useAppResume } from 'src/composables/use-app-resume';
import { bootTimer } from 'src/boot/perf-timer';
import { reporter } from 'src/boot/report';
import { useServerEnvironmentStore } from 'src/stores/server-environment';
import { canUseRemoteAccountFeatures } from 'src/utils/server-capabilities';
import { to } from 'orgnote-api/utils';

type AuthStore = ReturnType<typeof api.core.useAuth>;

const retryRemoteSync = async (): Promise<void> => {
  await useServerEnvironmentStore().load();
  await api.core.useSync().sync();
};

const initializeAuth = async (authStore: AuthStore): Promise<void> => {
  const serverEnvironment = useServerEnvironmentStore();
  serverEnvironment.watchServerChanges();
  await bootTimer.measure('auth-verify-user', () => authStore.verifyUser());
  await serverEnvironment.load();
};

const syncEligibleUser = async (authStore: AuthStore): Promise<void> => {
  if (!navigator.onLine) return;
  if (!canUseRemoteAccountFeatures(authStore.user, useServerEnvironmentStore().isSelfHosted)) {
    return;
  }
  await runPostActivationSync();
};

const runAuthStartup = async (authStore: AuthStore): Promise<void> => {
  const initializationResult = await to(initializeAuth)(authStore);
  useAutoSync();
  if (initializationResult.isErr()) {
    reporter.reportWarning(initializationResult.error);
    return;
  }

  const syncResult = await to(syncEligibleUser)(authStore);
  if (syncResult.isErr()) reporter.reportWarning(syncResult.error);
};

export default defineBoot(() => {
  const authStore = api.core.useAuth();
  useAppResume(retryRemoteSync);
  void runAuthStartup(authStore);
});
