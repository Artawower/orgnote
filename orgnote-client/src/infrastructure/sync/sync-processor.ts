import type { LocalFile, RemoteFile, ProcessCallback, SyncContext } from 'orgnote-api';
import {
  processUpload,
  processDownload,
  processDeleteLocal,
  processDeleteRemote,
  SyncOperationType,
} from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { to } from 'orgnote-api/utils';
import type { SyncQueueTask } from 'src/models/sync-queue-task';
import { recordConfigSyncOperationEvent } from 'src/infrastructure/config/config-lifecycle-record';

const getTaskPath = (task: SyncQueueTask): string => {
  if (typeof task.data === 'string') return task.data;
  return task.data.path;
};


const processSyncTask = async (task: SyncQueueTask, ctx: SyncContext): Promise<void> => {
  const processors: Record<SyncOperationType, () => Promise<void>> = {
    [SyncOperationType.Upload]: () => processUpload(task.data as LocalFile, ctx),
    [SyncOperationType.Download]: () => processDownload(task.data as RemoteFile, ctx),
    [SyncOperationType.DeleteLocal]: () => processDeleteLocal(task.data as string, ctx),
    [SyncOperationType.DeleteRemote]: () => processDeleteRemote(task.data as string, ctx),
  };

  await processors[task.type]?.();
};

export interface SyncContextProvider {
  getContext: (serverTime: string) => SyncContext | null;
}

const handleSyncTaskSuccess = (
  path: string,
  type: SyncOperationType,
  cb: ProcessCallback,
): void => {
  recordConfigSyncOperationEvent('config-sync-operation-completed', path, type);
  cb(null);
};

const handleSyncTaskFailure = (
  path: string,
  type: SyncOperationType,
  error: unknown,
  cb: ProcessCallback,
): void => {
  recordConfigSyncOperationEvent('config-sync-operation-failed', path, type, {
    errorName: error instanceof Error ? error.name : 'unknown',
  });
  reporter.reportWarning(`${type} failed: ${path} - ${error}`);
  cb(error);
};

const executeSyncQueueTask = async (
  payload: SyncQueueTask,
  ctx: SyncContext,
  cb: ProcessCallback,
): Promise<void> => {
  const path = getTaskPath(payload);
  recordConfigSyncOperationEvent('config-sync-operation-started', path, payload.type);
  const result = await to(processSyncTask)(payload, ctx);
  if (result.isErr()) {
    handleSyncTaskFailure(path, payload.type, result.error, cb);
    return;
  }
  handleSyncTaskSuccess(path, payload.type, cb);
};

export const createQueueTaskProcessor = (provider: SyncContextProvider) => {
  return (rawTask: unknown, cb: ProcessCallback): void => {
    const { payload } = rawTask as { payload: SyncQueueTask };
    const ctx = provider.getContext(payload.serverTime);

    if (!ctx) {
      cb(new Error('Sync context not available'));
      return;
    }

    void executeSyncQueueTask(payload, ctx, cb);
  };
};
