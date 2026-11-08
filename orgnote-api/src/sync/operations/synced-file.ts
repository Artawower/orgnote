import type { SyncedFile, SyncStatus } from '../types';

interface FileMeta {
  mtime: number;
  size: number;
  contentHash?: string;
}

export interface SyncedFileOptions {
  version?: number;
  status: SyncStatus;
  syncedAt?: string;
  errorMessage?: string;
  conflictPath?: string;
}

export const createSyncedFile = (
  meta: FileMeta,
  options: SyncedFileOptions
): SyncedFile => ({
  mtime: meta.mtime,
  size: meta.size,
  contentHash: meta.contentHash,
  ...options,
});
