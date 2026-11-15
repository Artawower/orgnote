import { defineBoot } from '#q-app/wrappers';
import {
  getExtensionRuntimeRootPath,
  hookStoreActions,
  isSyncConflictPath,
  join,
  toAbsolutePath,
  type StoreActionHooks,
} from 'orgnote-api';
import { to } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { useFileSystemStore } from 'src/stores/file-system';
import { useSyncStore } from 'src/stores/sync';
import { debounce } from 'src/utils/debounce';
import { isPathInsideRoot } from 'src/utils/is-path-inside-root';

const FS_SYNC_DEBOUNCE_MS = 1200;

type FileSystemPiniaStore = ReturnType<typeof useFileSystemStore>;
type FilePath = Parameters<FileSystemPiniaStore['writeFile']>[0];
type ScheduleSync = (paths: readonly FilePath[], ignoreConflictArtifacts?: boolean) => void;

const normalizeActionPath = (path: FilePath): string =>
  toAbsolutePath(typeof path === 'string' ? path : join(...path));

const isExtensionRuntimePath = (path: string): boolean =>
  isPathInsideRoot(path, toAbsolutePath(getExtensionRuntimeRootPath()));

const shouldTriggerSyncForPaths = (
  paths: readonly FilePath[],
  ignoreConflictArtifacts = false,
): boolean =>
  paths
    .map(normalizeActionPath)
    .some(
      (path) =>
        !isExtensionRuntimePath(path) && (!ignoreConflictArtifacts || !isSyncConflictPath(path)),
    );

const createFileSyncHooks = (
  scheduleSync: ScheduleSync,
): StoreActionHooks<FileSystemPiniaStore> => ({
  writeFile: { after: ({ args: [path] }) => scheduleSync([path], true) },
  rename: {
    after: ({ args: [sourcePath, destinationPath] }) => scheduleSync([sourcePath, destinationPath]),
  },
  deleteFile: { after: ({ args: [path] }) => scheduleSync([path], true) },
  mkdir: { after: ({ args: [path] }) => scheduleSync([path]) },
  rmdir: { after: ({ args: [path] }) => scheduleSync([path]) },
  copyFile: {
    after: ({ args: [, destinationPath] }) => scheduleSync([destinationPath]),
  },
});

export default defineBoot(({ store }) => {
  const syncStore = useSyncStore(store);
  const fileSystemStore = useFileSystemStore(store);
  const runDebouncedSync = debounce(async () => {
    const result = await to(() => syncStore.sync(), 'Failed to sync after fs action')();
    if (result.isErr()) reporter.reportWarning(result.error);
  }, FS_SYNC_DEBOUNCE_MS);
  const scheduleSync: ScheduleSync = (paths, ignoreConflictArtifacts) => {
    if (!shouldTriggerSyncForPaths(paths, ignoreConflictArtifacts)) return;
    runDebouncedSync();
  };

  hookStoreActions(fileSystemStore, createFileSyncHooks(scheduleSync));
});
