import type { Ref } from 'vue';
import type { DiskFile, FileSystem, FileSystemSession, OrgNoteConfig } from 'orgnote-api';
import { ErrorFileNotFound, toAbsolutePath } from 'orgnote-api';
import { stringifyToml, to } from 'orgnote-api/utils';
import { err, type Result } from 'neverthrow';
import { DEFAULT_CONFIG, DEFAULT_CONFIG_CONTENT } from 'src/constants/config';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { reporter } from 'src/boot/report';
import { recordConfigLifecycleEvent } from './config-lifecycle-record';
import { withFlag } from 'src/utils/with-flag';

export class ConfigStorageContextInvalidatedError extends Error {
  constructor() {
    super('Config storage context invalidated');
    this.name = 'ConfigStorageContextInvalidatedError';
  }
}

export interface ConfigStorageContext {
  readonly session: FileSystemSession;
  readonly isActive: () => boolean;
  readonly run: <T>(
    operation: (fs: FileSystem) => Promise<T>,
  ) => Promise<T | undefined>;
}

export interface FileWatcherEmitter {
  emitChange: (change: {
    path: string;
    type: 'modify' | 'rename' | 'delete';
    previousPath?: string;
    mtime?: number;
  }) => Promise<void>;
}

export const normalizeConfigPath = (path: string): string => toAbsolutePath(path);

const rawFileInfo = async (
  ctx: ConfigStorageContext,
  path: string,
): Promise<Result<DiskFile | undefined, Error>> =>
  to(() => ctx.session.fs.fileInfo(path))();

const rawEnsureDir = async (
  ctx: ConfigStorageContext,
  dirPath: string,
): Promise<boolean> => {
  if (!ctx.isActive()) return false;
  const isExistRes = await to(() => ctx.session.fs.isDirExist(dirPath))();
  if (!ctx.isActive()) return false;
  if (isExistRes.isOk() && isExistRes.value) return true;
  const mkdirRes = await to(() => ctx.session.fs.mkdir(dirPath))();
  if (mkdirRes.isErr()) {
    reporter.reportError(mkdirRes.error);
    return false;
  }
  if (!ctx.isActive()) return false;
  return true;
};

const rawEmitModify = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
): Promise<boolean> => {
  if (!ctx.isActive()) return false;
  const infoRes = await rawFileInfo(ctx, path);
  if (!ctx.isActive()) return false;
  await watcher.emitChange({
    path,
    type: 'modify',
    mtime: infoRes.isOk() ? infoRes.value?.mtime : undefined,
  });
  return true;
};

const rawEmitRename = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
  previousPath: string,
): Promise<boolean> => {
  if (!ctx.isActive()) return false;
  const infoRes = await rawFileInfo(ctx, path);
  if (!ctx.isActive()) return false;
  await watcher.emitChange({
    path,
    type: 'rename',
    previousPath,
    mtime: infoRes.isOk() ? infoRes.value?.mtime : undefined,
  });
  return true;
};

export const safeReadFile = async (
  ctx: ConfigStorageContext,
  path: string,
): Promise<Result<string, Error>> => {
  const runResult = await ctx.run(async (fs) => {
    if (!ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
    const normalizedPath = normalizeConfigPath(path);
    const res = await to(() => fs.readFile(normalizedPath, 'utf8'))();
    if (res.isErr()) {
      recordConfigLifecycleEvent('config-read-failed', undefined, { errorName: res.error.name });
      reporter.reportError(res.error);
    }
    return res;
  });
  if (!runResult || !ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
  return runResult;
};

export const safeFileInfo = async (
  ctx: ConfigStorageContext,
  path: string,
): Promise<Result<DiskFile | undefined, Error>> => {
  const runResult = await ctx.run(async (fs) => {
    if (!ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
    const normalizedPath = normalizeConfigPath(path);
    const res = await to(() => fs.fileInfo(normalizedPath))();
    if (res.isErr()) {
      recordConfigLifecycleEvent('config-metadata-read-failed', undefined, {
        errorName: res.error.name,
      });
      reporter.reportError(res.error);
    }
    return res;
  });
  if (!runResult || !ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
  return runResult;
};

export const safeReadDir = async (
  ctx: ConfigStorageContext,
  path: string,
): Promise<Result<DiskFile[], Error>> => {
  const runResult = await ctx.run(async (fs) => {
    if (!ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
    const normalizedPath = normalizeConfigPath(path);
    const res = await to(() => fs.readDir(normalizedPath))();
    if (res.isErr()) reporter.reportError(res.error);
    return res;
  });
  if (!runResult || !ctx.isActive()) return err(new ConfigStorageContextInvalidatedError());
  return runResult;
};

const reportWriteFailure = (error: Error): false => {
  recordConfigLifecycleEvent('config-write-failed', undefined, {
    errorName: error.name,
  });
  reporter.reportError(error);
  return false;
};

const retryWriteAfterMissingDir = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
  content: string,
): Promise<boolean> => {
  const dirPath = getFileDirPath(path);
  if (!(await rawEnsureDir(ctx, dirPath)) || !ctx.isActive()) return false;
  const retryRes = await to(() => ctx.session.fs.writeFile(path, content, 'utf8'))();
  if (retryRes.isErr()) return reportWriteFailure(retryRes.error);
  if (!ctx.isActive()) return false;
  return rawEmitModify(ctx, watcher, path);
};

export const safeWriteFile = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
  content: string,
): Promise<boolean> => {
  const runResult = await ctx.run(async (fs) => {
    if (!ctx.isActive()) return false;
    const normalizedPath = normalizeConfigPath(path);
    const res = await to(() => fs.writeFile(normalizedPath, content, 'utf8'))();
    if (res.isOk()) return rawEmitModify(ctx, watcher, normalizedPath);
    if (!(res.error instanceof ErrorFileNotFound) || !ctx.isActive()) {
      return reportWriteFailure(res.error);
    }
    return retryWriteAfterMissingDir(ctx, watcher, normalizedPath, content);
  });
  return Boolean(runResult && ctx.isActive());
};

const retryRenameAfterMissingDir = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  oldPath: string,
  newPath: string,
): Promise<boolean> => {
  const dirPath = getFileDirPath(newPath);
  if (!(await rawEnsureDir(ctx, dirPath)) || !ctx.isActive()) return false;
  const retryRes = await to(() => ctx.session.fs.rename(oldPath, newPath))();
  if (retryRes.isErr()) {
    reporter.reportError(retryRes.error);
    return false;
  }
  if (!ctx.isActive()) return false;
  return rawEmitRename(ctx, watcher, newPath, oldPath);
};

export const safeRename = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  oldPath: string,
  newPath: string,
): Promise<boolean> => {
  const runResult = await ctx.run(async (fs) => {
    if (!ctx.isActive()) return false;
    const normalizedOld = normalizeConfigPath(oldPath);
    const normalizedNew = normalizeConfigPath(newPath);
    const res = await to(() => fs.rename(normalizedOld, normalizedNew))();
    if (res.isOk()) return rawEmitRename(ctx, watcher, normalizedNew, normalizedOld);
    if (!(res.error instanceof ErrorFileNotFound) || !ctx.isActive()) {
      reporter.reportError(res.error);
      return false;
    }
    return retryRenameAfterMissingDir(ctx, watcher, normalizedOld, normalizedNew);
  });
  return Boolean(runResult && ctx.isActive());
};

export const ensureConfigFile = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
  isSavingDiskConfig: Ref<boolean>,
): Promise<number | undefined> => {
  const fileInfoRes = await safeFileInfo(ctx, path);
  if (!ctx.isActive() || fileInfoRes.isErr()) return;
  if (fileInfoRes.value) return fileInfoRes.value.mtime;

  recordConfigLifecycleEvent('default-config-write-requested', DEFAULT_CONFIG, {
    source: 'missing-disk-config',
  });
  const writeOk = await withFlag(isSavingDiskConfig, () =>
    safeWriteFile(ctx, watcher, path, DEFAULT_CONFIG_CONTENT),
  );
  if (!writeOk || !ctx.isActive()) return;
  const newFileInfoRes = await safeFileInfo(ctx, path);
  if (!ctx.isActive() || newFileInfoRes.isErr() || !newFileInfoRes.value) return;
  return newFileInfoRes.value.mtime;
};

export const persistConfigSnapshot = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  path: string,
  snapshot: OrgNoteConfig,
  isSavingDiskConfig: Ref<boolean>,
): Promise<number | undefined> => {
  const tomlContent = stringifyToml(snapshot);
  const writeOk = await withFlag(isSavingDiskConfig, () =>
    safeWriteFile(ctx, watcher, path, tomlContent),
  );
  if (!writeOk || !ctx.isActive()) return;
  const writtenInfoRes = await safeFileInfo(ctx, path);
  if (!ctx.isActive() || writtenInfoRes.isErr() || !writtenInfoRes.value) return;
  return writtenInfoRes.value.mtime;
};
