import type { SyncContext, UploadResult } from '../types';
import { isOrgNoteConfigPath } from '../config-path';
import { generateConflictPath } from '../conflict-path';
import { hashContent } from '../utils/content-hash';
import { createSyncedFile } from './synced-file';
import { resolveContentHash } from './content-hash';
import { downloadRemoteContent } from './remote-content';

type ConflictUploadResult = Extract<UploadResult, { status: 'conflict' }>;

class MissingSyncContentFetcherError extends Error {
  constructor() {
    super('OrgNote config preservation requires a non-mutating content fetch');
    this.name = 'MissingSyncContentFetcherError';
  }
}

const removeMissingRemoteState = async (
  path: string,
  ctx: SyncContext
): Promise<void> => {
  await ctx.state.removeFile(path);
  await ctx.baseStore?.remove(path);
};

const storeRemoteBase = async (
  path: string,
  version: number,
  content: Uint8Array,
  ctx: SyncContext
): Promise<void> => {
  if (!ctx.baseStore) return;
  await ctx.baseStore.set(path, {
    path,
    version,
    content,
    contentHash: await hashContent(content),
    updatedAt: ctx.serverTime,
  });
};

const storeConflictState = async (
  path: string,
  conflictPath: string,
  version: number,
  ctx: SyncContext
): Promise<void> => {
  const fileInfo = await ctx.fs.fileInfo(path);
  const contentHash = await resolveContentHash(ctx.fs, path);
  await ctx.state.setFile(path, createSyncedFile({
    mtime: fileInfo?.mtime ?? 0,
    size: fileInfo?.size ?? 0,
    contentHash,
  }, {
    version,
    status: 'pending',
    syncedAt: ctx.serverTime,
    conflictPath,
  }));
};

export const shouldKeepLocalConfig = (path: string): boolean =>
  isOrgNoteConfigPath(path);

export const keepLocalConfig = async (
  path: string,
  conflictResult: ConflictUploadResult,
  ctx: SyncContext
): Promise<void> => {
  if (!ctx.executor.fetchContent) throw new MissingSyncContentFetcherError();
  const remoteContent = await downloadRemoteContent(path, conflictResult.serverVersion, ctx);
  if (!remoteContent) return removeMissingRemoteState(path, ctx);

  const deviceName = `${ctx.deviceName ?? 'device'}-remote`;
  const conflictPath = generateConflictPath(path, deviceName);
  await ctx.fs.writeFile(conflictPath, remoteContent);
  await storeConflictState(path, conflictPath, conflictResult.serverVersion, ctx);
  await storeRemoteBase(path, conflictResult.serverVersion, remoteContent, ctx);
};
