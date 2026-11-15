import type { Ref } from 'vue';
import type { Result } from 'neverthrow';
import type { ConfigStorageContext, FileWatcherEmitter } from './config-storage';
import { safeFileInfo, safeReadFile } from './config-storage';
import { quarantineBrokenConfig } from './config-quarantine';
import { recordConfigLifecycleEvent } from './config-lifecycle-record';

export interface LoadDiskConfigOptions {
  readonly ctx: ConfigStorageContext;
  readonly watcher: FileWatcherEmitter;
  readonly diskConfigPath: string;
  readonly configSystemDir: string;
  readonly isSavingDiskConfig: Ref<boolean>;
  readonly lastDiskMtime: number;
  readonly force: boolean;
  readonly onApplyDefault: (source: string) => void;
  readonly applyContent: (content: string) => Result<void, Error>;
}

export const loadDiskConfig = async (
  options: LoadDiskConfigOptions,
): Promise<number | undefined> => {
  const fileInfoRes = await safeFileInfo(options.ctx, options.diskConfigPath);
  if (!options.ctx.isActive() || fileInfoRes.isErr() || !fileInfoRes.value) return;
  const mtime = fileInfoRes.value.mtime;
  if (!options.force && mtime <= options.lastDiskMtime) return mtime;

  const contentRes = await safeReadFile(options.ctx, options.diskConfigPath);
  if (!options.ctx.isActive() || contentRes.isErr()) return;
  if (!contentRes.value) {
    recordConfigLifecycleEvent('empty-config-read-deferred');
    return;
  }
  const content = contentRes.value;

  const result = options.applyContent(content);
  if (!options.ctx.isActive()) return;
  if (result.isErr()) {
    return quarantineBrokenConfig(
      {
        ctx: options.ctx,
        watcher: options.watcher,
        diskConfigPath: options.diskConfigPath,
        configSystemDir: options.configSystemDir,
        isSavingDiskConfig: options.isSavingDiskConfig,
        onQuarantined: options.onApplyDefault,
      },
      result.error,
      content,
    );
  }

  return mtime;
};
