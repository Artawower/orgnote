import type { Ref } from 'vue';
import { reporter } from 'src/boot/report';
import { DEFAULT_CONFIG_CONTENT } from 'src/constants/config';
import { getNextBrokenConfigIndex } from 'src/utils/get-next-broken-config-index';
import { withFlag } from 'src/utils/with-flag';
import type { ConfigStorageContext, FileWatcherEmitter } from './config-storage';
import { safeFileInfo, safeReadDir, safeRename, safeWriteFile } from './config-storage';

export interface QuarantineOptions {
  readonly ctx: ConfigStorageContext;
  readonly watcher: FileWatcherEmitter;
  readonly diskConfigPath: string;
  readonly configSystemDir: string;
  readonly isSavingDiskConfig: Ref<boolean>;
  readonly onQuarantined: (source: string) => void;
}

const getNextBrokenConfigPath = async (
  ctx: ConfigStorageContext,
  configSystemDir: string,
): Promise<string | undefined> => {
  const filesRes = await safeReadDir(ctx, configSystemDir);
  if (!ctx.isActive() || filesRes.isErr()) return;
  const index = getNextBrokenConfigIndex(filesRes.value);
  return `${configSystemDir}/config-broken-${index}.toml`;
};

const resetDiskConfigToDefault = (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  diskConfigPath: string,
): Promise<boolean> =>
  safeWriteFile(ctx, watcher, diskConfigPath, DEFAULT_CONFIG_CONTENT);

const persistBrokenConfig = async (
  ctx: ConfigStorageContext,
  watcher: FileWatcherEmitter,
  diskConfigPath: string,
  brokenPath: string,
  rawContent: string,
): Promise<boolean> => {
  if (await safeRename(ctx, watcher, diskConfigPath, brokenPath)) return true;
  return safeWriteFile(ctx, watcher, brokenPath, rawContent);
};

export const quarantineBrokenConfig = async (
  options: QuarantineOptions,
  cause: Error,
  rawContent: string,
): Promise<number | undefined> => {
  const { ctx, watcher, diskConfigPath, configSystemDir, isSavingDiskConfig, onQuarantined } =
    options;
  if (!ctx.isActive()) return;
  const brokenPath = await getNextBrokenConfigPath(ctx, configSystemDir);
  if (!brokenPath || !ctx.isActive()) return;

  const quarantineResult = await withFlag(isSavingDiskConfig, async () => {
    const persisted = await persistBrokenConfig(
      ctx,
      watcher,
      diskConfigPath,
      brokenPath,
      rawContent,
    );
    if (!persisted || !ctx.isActive()) return false;
    return resetDiskConfigToDefault(ctx, watcher, diskConfigPath);
  });

  if (!quarantineResult || !ctx.isActive()) return;
  onQuarantined('invalid-disk-config');

  reporter.reportError(
    new Error(`Invalid config.toml was moved to ${brokenPath} and reset to defaults`, {
      cause,
    }),
  );
  const currentFileInfoRes = await safeFileInfo(ctx, diskConfigPath);
  if (!ctx.isActive() || currentFileInfoRes.isErr() || !currentFileInfoRes.value) return;
  return currentFileInfoRes.value.mtime;
};
