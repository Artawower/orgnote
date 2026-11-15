import type { FileSystem, FileSystemInfo, FileSystemManagerStore, FileSystemSession } from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useSettingsStore } from './settings';
import { reporter } from 'src/boot/report';
import { withFsRootGate } from 'src/infrastructure/file-systems/fs-root-gate';
import { resetStorageBoundStores } from 'src/infrastructure/stores/storage-bound-store';
import { createFileSystemSessionState } from 'src/infrastructure/file-systems/file-system-session';
import {
  createFileSystemTransitionRunner,
  type TargetSelection,
} from 'src/infrastructure/file-systems/file-system-transition-runner';

type DesiredStorageSnapshot = { fsName: string; root?: string };
interface ReconcileContext {
  fs: FileSystem;
  snapshot: DesiredStorageSnapshot;
}

export interface ClientFileSystemManagerStore extends FileSystemManagerStore {
  useFs: (fsName: string, targetVault?: string) => Promise<void>;
}

export const useFileSystemManagerStore = defineStore<string, ClientFileSystemManagerStore>(
  'file-system-manager',
  () => {
    const sessionState = createFileSystemSessionState();
    const currentFsName = ref<string>('');
    const registeredFileSystems = ref<Record<string, FileSystemInfo>>({});
    const currentFsInfo = computed(() => registeredFileSystems.value[currentFsName.value]);
    const fsInstances = ref<Record<string, FileSystem>>({});
    const fsMounted = ref(false);
    const isReconciling = ref(false);
    const mountedFsName = ref('');
    const mountedVault = ref<string | undefined>();

    let hasPendingReconcile = false;
    let activeReconcile: Promise<void> | null = null;

    const settings = useSettingsStore();

    const isSessionMounted = (): boolean => fsMounted.value && !isReconciling.value;

    const currentVault = (): string | undefined =>
      settings.settings.vault ?? currentFsInfo.value?.initialVault;

    const isVaultConfigured = (fs: FileSystem, vault?: string): boolean =>
      !fs.pickFolder || Boolean(vault);

    const checkStorageDiverged = (): boolean =>
      !fsMounted.value ||
      currentFsInfo.value?.name !== mountedFsName.value ||
      currentVault() !== mountedVault.value;

    const getOrCreateFs = (info: FileSystemInfo): FileSystem => {
      const existing = fsInstances.value[info.name];
      if (existing) return existing;
      const created = info.fs();
      fsInstances.value = { ...fsInstances.value, [info.name]: created };
      return created;
    };

    const publishSession = (): void => {
      if (!isSessionMounted() || checkStorageDiverged()) {
        sessionState.clear();
        return;
      }
      const confirmedInfo = registeredFileSystems.value[mountedFsName.value];
      if (!confirmedInfo) {
        sessionState.clear();
        return;
      }
      const confirmedFs = getOrCreateFs(confirmedInfo);
      if (!isVaultConfigured(confirmedFs, mountedVault.value)) {
        sessionState.clear();
        return;
      }
      sessionState.publishIfChanged(confirmedFs, mountedFsName.value, mountedVault.value);
    };

    const currentSession = computed<FileSystemSession | null>(
      () => sessionState.currentSession.value,
    );

    const runWithMountedFileSystem = async <T>(
      session: FileSystemSession,
      operation: (fs: FileSystem) => Promise<T>,
    ): Promise<T | undefined> => {
      if (!sessionState.isActive(session)) return undefined;
      return withFsRootGate(session.fs, async () => {
        if (!sessionState.isActive(session)) return undefined;
        return operation(session.fs);
      });
    };

    const currentFs = computed(() => (currentFsInfo.value ? fsInstances.value[currentFsInfo.value.name] : undefined));

    const fileSystems = computed(() => Object.values(registeredFileSystems.value));

    const register = (fs: FileSystemInfo): void => {
      registeredFileSystems.value = { ...registeredFileSystems.value, [fs.name]: fs };
      publishSession();
    };

    const resetMountedState = (): void => {
      fsMounted.value = false;
      mountedFsName.value = '';
      mountedVault.value = undefined;
      sessionState.clear();
    };

    const applyParams = (params?: { root?: string } | void): void => {
      if (params && 'root' in params) settings.settings.vault = params.root;
    };

    const createDesiredSnapshot = (fsName: string): DesiredStorageSnapshot => ({
      fsName,
      root: currentVault(),
    });

    const isCurrentDesired = (snapshot: DesiredStorageSnapshot): boolean => {
      const pending = transitionRunner?.getPendingTarget();
      const desiredFs = pending?.fsName ?? currentFsInfo.value?.name;
      const desiredRoot = pending?.targetVault !== undefined ? pending.targetVault : currentVault();
      return desiredFs === snapshot.fsName && desiredRoot === snapshot.root;
    };

    const isDesiredRuntimeMounted = (fsName: string, root?: string): boolean =>
      fsMounted.value && mountedFsName.value === fsName && mountedVault.value === root;

    const applyMountedState = (fsName: string, root: string | undefined, mounted: boolean): void => {
      fsMounted.value = mounted;
      mountedFsName.value = mounted ? fsName : '';
      mountedVault.value = mounted ? root : undefined;
      publishSession();
    };

    const createReconcileContext = (): ReconcileContext | undefined => {
      const info = currentFsInfo.value;
      if (!info) {
        resetMountedState();
        return;
      }
      const snapshot = createDesiredSnapshot(info.name);
      if (isDesiredRuntimeMounted(snapshot.fsName, snapshot.root)) return;
      return { fs: getOrCreateFs(info), snapshot };
    };

    const initializeDesiredFs = async (context: ReconcileContext): Promise<boolean> => {
      const { fs, snapshot } = context;
      return withFsRootGate(fs, async () => {
        if (!isCurrentDesired(snapshot)) return false;
        const params = await fs.init?.({ root: snapshot.root });
        if (!isCurrentDesired(snapshot)) return false;
        applyParams(params);
        return true;
      });
    };

    const mountDesiredFs = async (context: ReconcileContext): Promise<void> =>
      withFsRootGate(context.fs, async () => {
        const mountSnapshot = createDesiredSnapshot(context.snapshot.fsName);
        if (!isCurrentDesired(mountSnapshot)) return;
        const mounted = await context.fs.mount?.({ root: mountSnapshot.root });
        if (!isCurrentDesired(mountSnapshot)) return;
        applyMountedState(mountSnapshot.fsName, mountSnapshot.root, mounted ?? true);
      });

    const reconcileContext = async (context: ReconcileContext): Promise<void> => {
      if (await initializeDesiredFs(context)) await mountDesiredFs(context);
    };

    const runReconcile = async (): Promise<void> => {
      const context = createReconcileContext();
      if (!context) {
        publishSession();
        return;
      }
      isReconciling.value = true;
      resetMountedState();
      const result = await to(() => reconcileContext(context))();
      isReconciling.value = false;
      if (result.isErr()) throw result.error;
    };

    const runQueuedReconcile = async (): Promise<void> => {
      hasPendingReconcile = false;
      const result = await to(runReconcile)();
      if (result.isErr()) {
        activeReconcile = null;
        hasPendingReconcile = false;
        throw result.error;
      }
      if (!hasPendingReconcile) {
        activeReconcile = null;
        return;
      }
      activeReconcile = runQueuedReconcile();
      await activeReconcile;
    };

    const reconcileStorageRuntime = async (): Promise<void> => {
      hasPendingReconcile = true;
      activeReconcile ??= runQueuedReconcile();
      await activeReconcile;
    };

    const restoreConfirmedSession = (): void => {
      settings.settings.vault = mountedVault.value;
      publishSession();
    };

    const applyTargetSelection = (target: TargetSelection): void => {
      const isSelectingDifferentFs = Boolean(currentFsName.value) && currentFsName.value !== target.fsName;
      const isChangingConfirmedFs = Boolean(mountedFsName.value) && mountedFsName.value !== target.fsName;
      if (isSelectingDifferentFs || isChangingConfirmedFs) {
        resetMountedState();
        settings.settings.vault = undefined;
      }
      if (target.targetVault !== undefined) settings.settings.vault = target.targetVault;
      currentFsName.value = target.fsName;
    };

    const checkShouldReset = (target: TargetSelection): boolean => {
      if (!mountedFsName.value) return false;
      if (mountedFsName.value !== target.fsName) return true;
      const targetRoot = target.targetVault !== undefined ? target.targetVault : currentVault();
      return mountedVault.value !== targetRoot;
    };

    const resetStorageState = async (): Promise<void> => {
      const resetResult = await to(resetStorageBoundStores)();
      if (resetResult.isOk()) return;
      reporter.reportError(resetResult.error);
      throw resetResult.error;
    };

    const transitionRunner = createFileSystemTransitionRunner({
      checkShouldReset,
      onResetRevoke: () => sessionState.clear(),
      resetStorage: resetStorageState,
      onResetFailure: restoreConfirmedSession,
      applyAndReconcile: async (target) => {
        applyTargetSelection(target);
        await reconcileStorageRuntime();
        publishSession();
      },
    });

    const reconcileStorageRuntimeSafely = async (): Promise<void> => {
      const result = await to(
        reconcileStorageRuntime,
        (error) => error instanceof Error ? error : new Error('storage reconcile failed'),
      )();
      if (result.isErr()) reporter.reportError(result.error);
    };

    const requestReconcile = (): void => {
      if (transitionRunner.isActive()) return;
      void reconcileStorageRuntimeSafely();
    };

    const useFs = (fsName: string, targetVault?: string): Promise<void> => {
      const info = registeredFileSystems.value[fsName];
      if (!info) return Promise.resolve();
      return transitionRunner.requestTransition({ fsName, targetVault });
    };

    watch(currentFsInfo, (info) => info && getOrCreateFs(info), { flush: 'sync' });

    const sessionTrigger = () =>
      [fsMounted.value, isReconciling.value, currentFsInfo.value?.name, settings.settings.vault] as const;
    watch(sessionTrigger, publishSession, { flush: 'sync' });

    watch(() => [currentFsInfo.value?.name, settings.settings.vault] as const, requestReconcile, {
      immediate: true,
    });

    return {
      register,
      currentFs,
      fileSystems,
      currentFsName,
      currentFsInfo,
      fsMounted,
      isReconciling,
      useFs,
      currentSession,
      runWithMountedFileSystem,
    };
  },
  { persist: { pick: ['currentFsName'] } },
);
