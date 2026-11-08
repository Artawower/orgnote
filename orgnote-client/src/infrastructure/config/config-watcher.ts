import type { FileSystemChange, OrgNoteConfig } from 'orgnote-api';
import { recordConfigLifecycleEvent } from './config-lifecycle-record';

export type DiskChangeAction = 'delete' | 'reload' | 'ignore';

export const shouldIgnoreDiskChange = (
  change: FileSystemChange,
  isSaving: boolean,
  lastDiskMtime: number,
): boolean => {
  if (isSaving) return true;
  if (change.type === 'delete') return true;
  if (typeof change.mtime !== 'number') return false;
  return change.mtime <= lastDiskMtime;
};

export const resolveDiskChangeAction = (
  change: FileSystemChange,
  isSaving: boolean,
  lastDiskMtime: number,
): DiskChangeAction => {
  if (change.type === 'delete') return 'delete';
  if (shouldIgnoreDiskChange(change, isSaving, lastDiskMtime)) return 'ignore';
  return 'reload';
};

export const handleDiskConfigChange = (options: {
  change: FileSystemChange;
  isSaving: boolean;
  lastDiskMtime: number;
  config: OrgNoteConfig;
  onDelete: () => void;
  onReload: () => void;
}): void => {
  const action = resolveDiskChangeAction(options.change, options.isSaving, options.lastDiskMtime);
  recordConfigLifecycleEvent('config-store-file-change', options.config, {
    changeType: options.change.type,
    hasMtime: typeof options.change.mtime === 'number',
    isIgnored: action === 'ignore',
    isSaving: options.isSaving,
  });
  if (action === 'delete') {
    options.onDelete();
    return;
  }
  if (action === 'reload') {
    options.onReload();
  }
};
