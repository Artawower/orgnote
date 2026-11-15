import { boot } from 'quasar/wrappers';
import { useQueueStore } from 'src/stores/queue';
import { createQueueTaskProcessor, createSyncExecutor } from 'src/infrastructure/sync';
import type { SyncContextProvider } from 'src/infrastructure/sync';
import { createSyncState } from 'src/utils/sync-state';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { useSyncStore } from 'src/stores/sync';
import { storeToRefs } from 'pinia';
import { type FileSystem, type ProcessFn, buildBufferUri } from 'orgnote-api';
import { useFileSearchStore } from 'src/stores/file-search';
import { INDEX_QUEUE_ID, SYNC_QUEUE_ID } from 'src/constants/queue-ids';
import { getBaseContentStore } from 'src/infrastructure/stores/base-content-store';
import { useBufferStore } from 'src/stores/buffer';

interface IndexTaskPayload {
  filePath: string;
}

interface IndexTaskResult {
  indexed: string;
}

const INDEX_TASK_TIMEOUT_MS = 2 * 60 * 1000;

class InvalidIndexTaskError extends Error {
  constructor() {
    super('Invalid index task payload');
    this.name = 'InvalidIndexTaskError';
  }
}

const createSyncContextProvider = (): SyncContextProvider => ({
  getContext: (serverTime: string) => {
    const fsManager = useFileSystemManagerStore();
    const lowLevelFs = fsManager.currentFs as FileSystem;
    if (!lowLevelFs) return null;

    const syncStore = useSyncStore();
    const { stateData } = storeToRefs(syncStore);
    const state = createSyncState(stateData);
    const bufferStore = useBufferStore();

    return {
      executor: createSyncExecutor(lowLevelFs),
      state,
      fs: lowLevelFs,
      serverTime,
      baseStore: getBaseContentStore() ?? undefined,
      isDirtyFile: (path: string) => {
        const uri = buildBufferUri('file', path);
        return bufferStore.getBufferByUri(uri)?.isSaving ?? false;
      },
    };
  },
});

const isValidIndexTask = (task: unknown): task is { payload: { filePath: string } } => {
  if (!task || typeof task !== 'object') return false;
  const t = task as Record<string, unknown>;
  if (!t.payload || typeof t.payload !== 'object') return false;
  const p = t.payload as Record<string, unknown>;
  return typeof p.filePath === 'string';
};

const createIndexProcessor = (): ProcessFn<IndexTaskPayload, IndexTaskResult> => {
  return (task, callback): void => {
    if (!isValidIndexTask(task)) {
      callback(new InvalidIndexTaskError());
      return;
    }

    const { payload } = task;
    const fileSearch = useFileSearchStore();

    fileSearch
      .processFile(payload.filePath)
      .then(() => callback(undefined, { indexed: payload.filePath }))
      .catch(callback);
  };
};

export default boot(() => {
  const queueStore = useQueueStore();
  const provider = createSyncContextProvider();

  queueStore.register(SYNC_QUEUE_ID, {
    concurrent: 1,
    maxRetries: 2,
    retryDelay: 1000,
    failTaskOnProcessException: true,
    deduplicationStrategy: 'replace',
    process: createQueueTaskProcessor(provider),
  });

  queueStore.register(INDEX_QUEUE_ID, {
    concurrent: 1,
    maxTimeout: INDEX_TASK_TIMEOUT_MS,
    maxRetries: 2,
    retryDelay: 1000,
    failTaskOnProcessException: true,
    deduplicationStrategy: 'replace',
    process: createIndexProcessor(),
  });
});
