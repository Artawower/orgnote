import type { FileSystem } from '../models/file-system';
import type { FileChange, SyncApiFactory } from '../remote-api';
import { isOrgNoteConfigPath } from './config-path';

export type SyncApi = ReturnType<typeof SyncApiFactory>;

export type SyncStatus =
  | 'synced'
  | 'dirty'
  | 'uploading'
  | 'downloading'
  | 'error'
  | 'pending'
  | 'conflict';

export enum SyncOperationType {
  Upload = 'upload',
  Download = 'download',
  DeleteLocal = 'deleteLocal',
  DeleteRemote = 'deleteRemote',
}

export interface SyncedFile {
  mtime: number;
  size: number;
  contentHash?: string;
  version?: number;
  status: SyncStatus;
  syncedAt?: string;
  conflictPath?: string;
  errorMessage?: string;
}

export interface SyncStateData {
  files: Record<string, SyncedFile>;
}

export interface SyncState {
  get(): Promise<SyncStateData>;
  getFile(path: string): Promise<SyncedFile | null>;
  setFile(path: string, file: SyncedFile): Promise<void>;
  setSyncedAt(paths: readonly string[], syncedAt: string): Promise<void>;
  removeFile(path: string): Promise<void>;
  clear(): Promise<void>;
}

export interface LocalFile {
  path: string;
  mtime: number;
  size: number;
  contentHash?: string;
}

export type RemoteFile = Pick<
  FileChange,
  'path' | 'version' | 'deleted' | 'updatedAt' | 'contentHash'
>;

export type UploadResult =
  | { status: 'ok'; version: number }
  | { status: 'conflict'; serverVersion: number };

export type DeleteResult =
  | { status: 'ok' }
  | { status: 'conflict'; serverVersion: number };

export interface SyncExecutor {
  upload: (file: LocalFile, expectedVersion?: number) => Promise<UploadResult>;
  download: (file: RemoteFile) => Promise<Uint8Array | void>;
  fetchContent: (file: RemoteFile) => Promise<Uint8Array>;
  deleteLocal: (path: string) => Promise<void>;
  deleteRemote: (path: string, expectedVersion: number) => Promise<DeleteResult>;
}

export interface SyncPlan {
  toUpload: LocalFile[];
  toDownload: RemoteFile[];
  toDeleteLocal: string[];
  toDeleteRemote: string[];
  unchangedPaths: string[];
  serverTime: string;
}

export interface SyncTask {
  path: string;
  operation: SyncOperationType;
  file?: LocalFile | RemoteFile;
}

export interface CreateSyncPlanParams {
  fs: FileSystem;
  api: SyncApi;
  state: SyncState;
  rootPath: string;
  ignorePatterns?: string[];
  enableContentHashCheck?: boolean;
}

export interface SyncContext {
  executor: SyncExecutor;
  state: SyncState;
  fs: FileSystem;
  serverTime: string;
  deviceName?: string;
  isDirtyFile?: (path: string) => Promise<boolean> | boolean;
  baseStore?: BaseContentStore;
}

export enum MergeOutcome {
  Merged = 'merged',
  Ambiguous = 'ambiguous',
}

export interface MergeResult {
  outcome: MergeOutcome;
  mergedContent?: Uint8Array;
}

export interface BaseContentEntry {
  path: string;
  version: number;
  contentHash: string;
  content: Uint8Array;
  updatedAt: string;
}

export interface BaseContentStore {
  get(path: string): Promise<BaseContentEntry | null>;
  set(path: string, entry: BaseContentEntry): Promise<void>;
  remove(path: string): Promise<void>;
}

export interface MergeInputs {
  base: Uint8Array;
  local: Uint8Array;
  remote: Uint8Array;
}

const MERGEABLE_EXTENSIONS = new Set(['.org', '.md']);
const MAX_MERGEABLE_SIZE_BYTES = 512 * 1024;

export const isMergeableFile = (path: string, size: number): boolean => {
  if (size > MAX_MERGEABLE_SIZE_BYTES) return false;
  if (isOrgNoteConfigPath(path)) return true;

  const lastDot = path.lastIndexOf('.');
  const extension = lastDot >= 0 ? path.substring(lastDot) : '';
  return MERGEABLE_EXTENSIONS.has(extension);
};

