export { createSyncPlan } from './create-sync-plan';
export { createPlan } from './plan';
export { createMemorySyncState } from './memory-state';
export { createSyncPathIgnore, scanLocalFiles, findDeletedLocally } from './scan';
export { isSyncConflictPath } from './conflict-path';
export { InvalidSyncResponseError } from './invalid-response-error';
export type { InvalidSyncResponseDetails } from './invalid-response-error';
export { fetchRemoteChanges, InvalidSyncChangesResponseError } from './fetch';
export type {
  InvalidSyncChangesResponseDetails,
  InvalidSyncChangesResponseReason,
} from './fetch';
export { validateSyncFileResponse, InvalidSyncFileResponseError } from './download-response';
export type {
  InvalidSyncFileResponseDetails,
  InvalidSyncFileResponseReason,
} from './download-response';
export { recoverState } from './recovery';
export { getOldestSyncedAt } from './utils/oldest-synced-at';
export { hashContent, hashBytes } from './utils/content-hash';

export {
  processUpload,
  processDownload,
  processDeleteLocal,
  processDeleteRemote,
  handleConflict,
  generateConflictPath,
  hasConflict,
} from './operations';

export { mergeFile, mergeText, mergeToml } from './merge';

export { SyncOperationType, MergeOutcome, isMergeableFile } from './types';

export type {
  SyncState,
  SyncStateData,
  SyncedFile,
  SyncStatus,
  LocalFile,
  RemoteFile,
  UploadResult,
  DeleteResult,
  SyncPlan,
  SyncTask,
  SyncExecutor,
  SyncContext,
  CreateSyncPlanParams,
  MergeResult,
  MergeInputs,
  BaseContentEntry,
  BaseContentStore,
} from './types';
