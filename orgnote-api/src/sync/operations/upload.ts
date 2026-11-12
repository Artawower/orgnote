import type { LocalFile, SyncContext, UploadResult } from '../types';
import {
  handleConflict,
  handleRemoteAuthoritativeConflict,
  tryMergeConflict,
} from './conflict';
import { createSyncedFile } from './synced-file';
import { resolveContentHash } from './content-hash';
import { readBinaryContent } from './read-binary-content';
import { hashContent } from '../utils/content-hash';
import { to } from '../../utils/to-error';
import { isOrgNoteConfigPath } from '../config-path';

const persistErrorState = async (
  file: LocalFile,
  expectedVersion: number | undefined,
  previousSyncedAt: string | undefined,
  error: unknown,
  ctx: SyncContext
): Promise<void> => {
  await ctx.state.setFile(
    file.path,
    createSyncedFile(file, {
      version: expectedVersion,
      status: 'error',
      syncedAt: previousSyncedAt,
      errorMessage: String(error),
    })
  );
};

export const processUpload = async (
  file: LocalFile,
  ctx: SyncContext
): Promise<void> => {
  const stored = await ctx.state.getFile(file.path);
  const expectedVersion = stored?.version;

  await ctx.state.setFile(
    file.path,
    createSyncedFile(file, {
      version: expectedVersion,
      status: 'uploading',
      syncedAt: stored?.syncedAt,
    })
  );

  const execute = ctx.baseStore
    ? to(
        (): Promise<void> =>
          executeUploadWithMergeRetry(file, expectedVersion, ctx)
      )
    : to((): Promise<void> => executeUpload(file, expectedVersion, ctx));

  const result = await execute();

  if (result.isOk()) return;

  await persistErrorState(
    file,
    expectedVersion,
    stored?.syncedAt,
    result.error,
    ctx
  );
  throw result.error;
};

const shouldPreferRemoteConfig = (
  file: LocalFile,
  expectedVersion: number | undefined,
  hasBase: boolean
): boolean =>
  isOrgNoteConfigPath(file.path) && expectedVersion === undefined && !hasBase;

const executeUpload = async (
  file: LocalFile,
  expectedVersion: number | undefined,
  ctx: SyncContext
): Promise<void> => {
  const result = await ctx.executor.upload(file, expectedVersion);

  if (result.status === 'ok') {
    await persistSyncedSnapshot(file.path, result.version, ctx);
    return;
  }

  if (shouldPreferRemoteConfig(file, expectedVersion, false)) {
    await handleRemoteAuthoritativeConflict(file.path, result, ctx);
    return;
  }

  await handleConflict(file.path, result, ctx);
};

type ConflictUploadResult = Extract<UploadResult, { status: 'conflict' }>;

const createCurrentLocalFile = async (
  file: LocalFile,
  ctx: SyncContext
): Promise<LocalFile> => {
  const content = await readBinaryContent(ctx.fs, file.path);
  const fileInfo = await ctx.fs.fileInfo(file.path);
  return {
    ...file,
    mtime: fileInfo?.mtime ?? file.mtime,
    size: fileInfo?.size ?? content.length,
    contentHash: await hashContent(content),
  };
};

const retryLocalConfigUpload = async (
  file: LocalFile,
  conflictResult: ConflictUploadResult,
  ctx: SyncContext
): Promise<void> => {
  await handleConflict(file.path, conflictResult, ctx);
  const currentFile = await createCurrentLocalFile(file, ctx);
  const retryResult = await ctx.executor.upload(
    currentFile,
    conflictResult.serverVersion
  );
  if (retryResult.status !== 'ok') {
    await handleConflict(file.path, retryResult, ctx);
    return;
  }
  await persistSyncedSnapshot(file.path, retryResult.version, ctx);
};

const executeUploadWithMergeRetry = async (
  file: LocalFile,
  expectedVersion: number | undefined,
  ctx: SyncContext
): Promise<void> => {
  const result = await ctx.executor.upload(file, expectedVersion);

  if (result.status === 'ok') {
    await persistSyncedSnapshot(file.path, result.version, ctx);
    return;
  }

  const baseEntry = ctx.baseStore ? await ctx.baseStore.get(file.path) : null;
  if (shouldPreferRemoteConfig(file, expectedVersion, Boolean(baseEntry))) {
    await handleRemoteAuthoritativeConflict(file.path, result, ctx);
    return;
  }

  const mergedContent = await tryMergeConflict(
    file.path,
    result,
    baseEntry?.content ?? null,
    ctx
  );

  if (!mergedContent && isOrgNoteConfigPath(file.path)) {
    await retryLocalConfigUpload(file, result, ctx);
    return;
  }

  if (!mergedContent) {
    await handleConflict(file.path, result, ctx);
    return;
  }

  const contentHash = await hashContent(mergedContent);
  const mergedFile: LocalFile = { ...file, contentHash };
  const retryResult = await ctx.executor.upload(
    mergedFile,
    result.serverVersion
  );

  if (retryResult.status !== 'ok') {
    await handleConflict(file.path, retryResult, ctx);
    return;
  }

  await persistSyncedSnapshot(file.path, retryResult.version, ctx);
};

const persistSyncedSnapshot = async (
  path: string,
  version: number,
  ctx: SyncContext
): Promise<void> => {
  const fileInfo = await ctx.fs.fileInfo(path);
  const contentHash = fileInfo ? await resolveContentHash(ctx.fs, path) : '';

  await ctx.state.setFile(
    path,
    createSyncedFile(
      {
        mtime: fileInfo?.mtime ?? 0,
        size: fileInfo?.size ?? 0,
        contentHash,
      },
      { version, status: 'synced', syncedAt: ctx.serverTime }
    )
  );

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
