import axios from 'axios';
import type { FileSystem } from '../../models/file-system';
import type { MergeInputs, SyncContext, UploadResult } from '../types';
import { MergeOutcome } from '../types';
import { createSyncedFile } from './synced-file';
import { resolveContentHash } from './content-hash';
import { readBinaryContent } from './read-binary-content';
import { mergeFile } from '../merge/file-merge';
import { isMergeableFile } from '../types';
import { to } from '../../utils/to-error';
import { generateConflictPath } from '../conflict-path';
import { keepLocalConfig, shouldKeepLocalConfig } from './config-conflict';
import { createRemoteFile, downloadRemoteContent } from './remote-content';

export { generateConflictPath } from '../conflict-path';

type ConflictUploadResult = Extract<UploadResult, { status: 'conflict' }>;

const copyFile = async (
  fs: FileSystem,
  src: string,
  dest: string
): Promise<void> => {
  if (fs.copyFile) {
    await fs.copyFile(src, dest);
    return;
  }

  const content = await fs.readFile(src, 'binary');
  await fs.writeFile(dest, content);
};

const isAxiosNotFound = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  return error.response?.status === 404;
};

const refreshBaseStore = async (
  path: string,
  version: number,
  contentHash: string,
  ctx: SyncContext
): Promise<void> => {
  if (!ctx.baseStore) return;

  const content = await readBinaryContent(ctx.fs, path);
  await ctx.baseStore.set(path, {
    path,
    version,
    contentHash,
    content,
    updatedAt: ctx.serverTime,
  });
};

const removeBaseStoreEntry = async (
  path: string,
  ctx: SyncContext
): Promise<void> => {
  if (!ctx.baseStore) return;

  await ctx.baseStore.remove(path);
};

const isDirty = async (path: string, ctx: SyncContext): Promise<boolean> => {
  if (!ctx.isDirtyFile) return false;
  return ctx.isDirtyFile(path);
};

const canAttemptMerge = async (
  path: string,
  baseContent: Uint8Array | null,
  ctx: SyncContext
): Promise<boolean> => {
  const fileInfo = await ctx.fs.fileInfo(path);
  if (!fileInfo) {
    return false;
  }

  if (!isMergeableFile(path, fileInfo.size)) {
    return false;
  }

  if (!baseContent) {
    return false;
  }

  const dirty = await isDirty(path, ctx);
  if (dirty) {
    return false;
  }

  return true;
};

export const tryMergeConflict = async (
  path: string,
  conflictResult: ConflictUploadResult,
  baseContent: Uint8Array | null,
  ctx: SyncContext
): Promise<Uint8Array | null> => {
  if (!(await canAttemptMerge(path, baseContent, ctx))) return null;

  const localContent = await readBinaryContent(ctx.fs, path);

  let remoteContent: Uint8Array | null;
  try {
    remoteContent = await downloadRemoteContent(
      path,
      conflictResult.serverVersion,
      ctx
    );
  } catch (error) {
    await ctx.fs.writeFile(path, localContent);
    throw error;
  }

  if (!remoteContent) {
    await ctx.fs.writeFile(path, localContent);
    return null;
  }

  const inputs: MergeInputs = {
    base: baseContent,
    local: localContent,
    remote: remoteContent,
  };

  const mergeResult = mergeFile(path, inputs);

  if (
    mergeResult.outcome !== MergeOutcome.Merged ||
    !mergeResult.mergedContent
  ) {
    if (!ctx.executor.fetchContent) await ctx.fs.writeFile(path, localContent);
    return null;
  }

  await ctx.fs.writeFile(path, mergeResult.mergedContent);
  return mergeResult.mergedContent;
};

const tryDownloadServerVersion = async (
  path: string,
  serverVersion: number,
  ctx: SyncContext
): Promise<boolean> => {
  const result = await to(ctx.executor.download)(
    createRemoteFile(path, serverVersion)
  );

  if (result.isErr()) {
    if (isAxiosNotFound(result.error)) return false;
    throw result.error;
  }

  return true;
};

const removeMissingServerFile = async (
  path: string,
  ctx: SyncContext
): Promise<void> => {
  await ctx.fs.deleteFile(path);
  await ctx.state.removeFile(path);
  await removeBaseStoreEntry(path, ctx);
};

const storeDownloadedConflict = async (
  path: string,
  conflictPath: string,
  serverVersion: number,
  ctx: SyncContext
): Promise<void> => {
  const fileInfo = await ctx.fs.fileInfo(path);
  const contentHash = await resolveContentHash(ctx.fs, path);
  const meta = {
    mtime: fileInfo?.mtime ?? 0,
    size: fileInfo?.size ?? 0,
    contentHash,
  };
  await ctx.state.setFile(path, createSyncedFile(meta, {
    version: serverVersion,
    status: 'synced',
    syncedAt: ctx.serverTime,
    conflictPath,
  }));
  await refreshBaseStore(path, serverVersion, contentHash, ctx);
};

export const handleRemoteAuthoritativeConflict = async (
  path: string,
  conflictResult: ConflictUploadResult,
  ctx: SyncContext
): Promise<void> => {
  const conflictPath = generateConflictPath(path, ctx.deviceName);
  await copyFile(ctx.fs, path, conflictPath);
  const downloaded = await tryDownloadServerVersion(
    path,
    conflictResult.serverVersion,
    ctx
  );
  if (!downloaded) return removeMissingServerFile(path, ctx);
  await storeDownloadedConflict(path, conflictPath, conflictResult.serverVersion, ctx);
};

export const handleConflict = async (
  path: string,
  conflictResult: ConflictUploadResult,
  ctx: SyncContext
): Promise<void> => {
  if (shouldKeepLocalConfig(path)) return keepLocalConfig(path, conflictResult, ctx);
  await handleRemoteAuthoritativeConflict(path, conflictResult, ctx);
};

export const hasConflict = (file: { conflictPath?: string }): boolean =>
  file.conflictPath !== undefined;
