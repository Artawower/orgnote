import {
  ORGNOTE_SYSTEM_ROOT_PATH,
  type ConfigStore,
  type OrgNoteConfig,
  toAbsolutePath,
  type FileSystemChange,
  type FileSystemSession,
} from 'orgnote-api';
import { defineStore } from 'pinia';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { computed, reactive, ref, watch } from 'vue';
import clone from 'rfdc';
import { debounce } from 'src/utils/debounce';
import { useFileSystemManagerStore } from './file-system-manager';
import { err, ok, type Result } from 'neverthrow';
import { isPresent, to } from 'orgnote-api/utils';
import { useFileWatcherStore } from './file-watcher';
import { ORGNOTE_CONFIG_FILE_PATH } from 'src/constants/system-file-paths';
import { withDeferredFlagReset } from 'src/utils/with-flag';
import { recordConfigLifecycleEvent } from 'src/infrastructure/config/config-lifecycle-record';
import {
  ensureConfigFile,
  persistConfigSnapshot,
  type ConfigStorageContext,
} from 'src/infrastructure/config/config-storage';
import { applyDiskConfig } from 'src/infrastructure/config/config-merge';
import { handleDiskConfigChange } from 'src/infrastructure/config/config-watcher';
import {
  buildStorageKey,
  clearUserMutationIfClean,
  createInitialMutationState,
  discardForeignMutation,
  recordUserMutation,
} from 'src/infrastructure/config/config-state';
import { loadDiskConfig } from 'src/infrastructure/config/config-disk';

export const useConfigStore = defineStore<'config', ConfigStore>('config', () => {
  const fileWatcher = useFileWatcherStore();
  const fsManager = useFileSystemManagerStore();
  const diskConfigPath = toAbsolutePath(ORGNOTE_CONFIG_FILE_PATH);
  const configSystemDir = toAbsolutePath(ORGNOTE_SYSTEM_ROOT_PATH);
  const lastDiskMtime = ref<number>(0);
  const isInitialized = ref(false);
  const isApplyingDiskConfig = ref(false);
  const isSavingDiskConfig = ref(false);
  let inFlightLoad: { sessionId: number; promise: Promise<void> } | null = null;
  let baselineConfig: OrgNoteConfig = clone()(DEFAULT_CONFIG);
  const mutations = createInitialMutationState();

  const currentSession = computed<FileSystemSession | null>(() => fsManager.currentSession);
  const isStorageReady = computed(() => isPresent(currentSession.value));
  const config = reactive<OrgNoteConfig>(clone()(DEFAULT_CONFIG));
  const configErrors = ref<string[]>([]);
  let currentStorageKey = currentSession.value?.storageKey ?? buildStorageKey();

  const captureContext = (): ConfigStorageContext | null => {
    const session = currentSession.value;
    if (!session) return null;
    return {
      session,
      isActive: () => currentSession.value?.id === session.id,
      run: (operation) => fsManager.runWithMountedFileSystem(session, operation),
    };
  };

  const hasPendingUserMutation = (): boolean =>
    mutations.dirtyKey === currentStorageKey && mutations.dirtyRevision > 0;

  const ensureConfigFileExists = async (ctx: ConfigStorageContext): Promise<boolean> => {
    const mtime = await ensureConfigFile(ctx, fileWatcher, diskConfigPath, isSavingDiskConfig);
    if (mtime === undefined || !ctx.isActive()) return false;
    lastDiskMtime.value = mtime;
    return true;
  };

  const applyDefaultConfig = (source: string): void => {
    withDeferredFlagReset(isApplyingDiskConfig, () => {
      Object.assign(config, clone()(DEFAULT_CONFIG));
      baselineConfig = clone()(DEFAULT_CONFIG);
      mutations.dirtyKey = null;
      mutations.dirtyRevision = 0;
      recordConfigLifecycleEvent('default-config-applied', config, { source });
    });
  };

  const applyConfigFromDisk = (rawConfigContent: string): Result<void, Error> => {
    configErrors.value = [];
    return withDeferredFlagReset(isApplyingDiskConfig, () => {
      const parsed = applyDiskConfig(rawConfigContent, config, baselineConfig, hasPendingUserMutation());
      if (parsed.isErr()) {
        configErrors.value = parsed.error.errors;
        return err(parsed.error.cause);
      }
      Object.assign(config, parsed.value.finalConfig);
      baselineConfig = clone()(parsed.value.validated);
      recordConfigLifecycleEvent('disk-config-applied', parsed.value.finalConfig, { source: 'disk-read' });
      return ok(undefined);
    });
  };

  const loadFromDisk = async (ctx: ConfigStorageContext, force = false): Promise<boolean> => {
    configErrors.value = [];
    const mtime = await loadDiskConfig({
      ctx,
      watcher: fileWatcher,
      diskConfigPath,
      configSystemDir,
      isSavingDiskConfig,
      lastDiskMtime: lastDiskMtime.value,
      force,
      onApplyDefault: applyDefaultConfig,
      applyContent: applyConfigFromDisk,
    });
    if (mtime === undefined || !ctx.isActive()) return false;
    lastDiskMtime.value = mtime;
    return true;
  };

  const saveToDisk = async (): Promise<void> => {
    if (!isInitialized.value || !isStorageReady.value) return;
    const ctx = captureContext();
    if (!ctx) return;
    recordConfigLifecycleEvent('memory-config-write-requested', config, { source: 'reactive-save' });

    const snapshot = clone()(config);
    const capturedRevision = mutations.dirtyRevision;
    const mtime = await persistConfigSnapshot(
      ctx,
      fileWatcher,
      diskConfigPath,
      snapshot,
      isSavingDiskConfig,
    );
    if (!ctx.isActive()) return;
    if (mtime === undefined) {
      saveToDiskDebounced();
      return;
    }

    lastDiskMtime.value = mtime;
    baselineConfig = clone()(snapshot);
    if (!clearUserMutationIfClean(mutations, ctx.session.storageKey, capturedRevision)) {
      saveToDiskDebounced();
    }
  };

  const saveToDiskDebounced = debounce(saveToDisk, 1000);

  let stopDiskConfigWatch: (() => void) | null = null;

  const onDiskConfigChange = (change: FileSystemChange): void => {
    handleDiskConfigChange({
      change,
      isSaving: isSavingDiskConfig.value,
      lastDiskMtime: lastDiskMtime.value,
      config,
      onDelete: () => {
        applyDefaultConfig('disk-delete-event');
        const ctx = captureContext();
        if (ctx) void ensureConfigFileExists(ctx);
      },
      onReload: () => {
        const ctx = captureContext();
        if (ctx) void loadFromDisk(ctx, true);
      },
    });
  };

  const startDiskConfigWatch = (): void => {
    stopDiskConfigWatch ??= fileWatcher.watch(diskConfigPath, onDiskConfigChange);
  };

  const resetDiskPersistence = (): void => {
    saveToDiskDebounced.cancel();
    stopDiskConfigWatch?.();
    stopDiskConfigWatch = null;
    lastDiskMtime.value = 0;
    isInitialized.value = false;
  };

  const executeInitialLoad = async (ctx: ConfigStorageContext): Promise<void> => {
    if (!ctx.isActive()) return;
    if (!(await ensureConfigFileExists(ctx)) || !ctx.isActive()) return;
    if (!(await loadFromDisk(ctx, true)) || !ctx.isActive()) return;

    startDiskConfigWatch();
    isInitialized.value = true;
    recordConfigLifecycleEvent('config-store-load-completed', config);
    if (hasPendingUserMutation()) saveToDiskDebounced();
  };

  const continueSessionLoadIfNeeded = async (loadedSessionId: number): Promise<void> => {
    const session = currentSession.value;
    if (!session || session.id === loadedSessionId || isInitialized.value) return;
    if (inFlightLoad?.sessionId === session.id) {
      await inFlightLoad.promise;
      return;
    }
    await load();
  };

  const load = async (): Promise<void> => {
    recordConfigLifecycleEvent('config-store-load-requested', config, {
      isInitialized: isInitialized.value,
      isReady: isStorageReady.value,
    });
    if (isInitialized.value || !currentSession.value) return;
    if (inFlightLoad?.sessionId === currentSession.value.id) return inFlightLoad.promise;

    const ctx = captureContext();
    if (!ctx) return;

    const runFlight = async (): Promise<void> => {
      const result = await to(executeInitialLoad)(ctx);
      if (inFlightLoad?.sessionId === ctx.session.id) inFlightLoad = null;
      if (result.isErr()) throw result.error;
    };
    const currentFlight = runFlight();
    inFlightLoad = { sessionId: ctx.session.id, promise: currentFlight };
    await currentFlight;
    await continueSessionLoadIfNeeded(ctx.session.id);
  };

  const traceContextChange = (): void => {
    recordConfigLifecycleEvent('config-storage-context-changed', config, {
      hasSession: Boolean(currentSession.value),
      isInitialized: isInitialized.value,
      isReady: isStorageReady.value,
    });
  };

  const handleSessionChange = (newSession: FileSystemSession | null): void => {
    traceContextChange();
    if (newSession && newSession.storageKey !== currentStorageKey) {
      currentStorageKey = newSession.storageKey;
      discardForeignMutation(mutations, currentStorageKey);
      baselineConfig = clone()(config);
    }
    resetDiskPersistence();
    if (newSession) void load();
  };

  const handleConfigMutation = (): void => {
    recordConfigLifecycleEvent('memory-config-changed', config, {
      isApplyingDiskConfig: isApplyingDiskConfig.value,
      isInitialized: isInitialized.value,
    });
    if (isApplyingDiskConfig.value) return;

    recordUserMutation(mutations, currentStorageKey);
    if (isInitialized.value) saveToDiskDebounced();
  };

  watch(currentSession, handleSessionChange, { deep: false, flush: 'sync' });
  watch(config, handleConfigMutation, { deep: true, flush: 'sync' });

  return {
    config,
    sync: load,
    load,
    configErrors,
  };
});
