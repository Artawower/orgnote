import { storeToRefs, type Pinia } from 'pinia';
import { watch } from 'vue';
import {
  DefaultCommands,
  isOrgFile,
  join,
  splitPath,
  type DiskFile,
  type FileSystemChange,
} from 'orgnote-api';
import { repositories } from 'src/boot/repositories';
import { reporter } from 'src/boot/report';
import { useCommandsStore } from 'src/stores/command';
import { useFileSearchStore } from 'src/stores/file-search';
import { useFileSystemStore } from 'src/stores/file-system';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { useFileWatcherStore } from 'src/stores/file-watcher';
import { isPathInsideRoot } from 'src/utils/is-path-inside-root';
import { affectsOrgIndex } from 'src/utils/org-fs-change';
import { walkDir } from 'src/utils/dir-items-getter';
import { userContentTraversalPolicy } from 'src/utils/file-traversal-policy';

export const useFileIndexing = (pinia: Pinia): void => {
  const commands = useCommandsStore(pinia);
  const fileSearch = useFileSearchStore(pinia);
  const fileSystem = useFileSystemStore(pinia);
  const fileSystemManager = useFileSystemManagerStore(pinia);
  const fileWatcher = useFileWatcherStore(pinia);
  const pendingChanges: FileSystemChange[] = [];
  const { isIndexing } = storeToRefs(fileSearch);
  const { fsMounted } = storeToRefs(fileSystemManager);
  const { isWatching } = storeToRefs(fileWatcher);

  const reportIndexingError = (error: unknown, message: string): void => {
    reporter.reportError(error instanceof Error ? error : new Error(message));
  };

  const listOrgFiles = async (path: string): Promise<DiskFile[]> => {
    const entries = await walkDir(fileSystem.readDir, path, {
      includeFiles: true,
      traversalPolicy: userContentTraversalPolicy,
    });
    return entries.filter((entry) => entry.type === 'file' && isOrgFile(entry.name));
  };

  const removeFilesUnderPrefix = async (dirPath: string): Promise<void> => {
    const allFiles = await repositories.fileRepository.getAll();
    const staleFiles = allFiles.filter((file) =>
      isPathInsideRoot(join('/', ...file.filePath), dirPath),
    );
    await Promise.all(staleFiles.map((file) => fileSearch.removeFile({ id: file.id })));
  };

  const handleDirectoryRename = async (change: FileSystemChange): Promise<void> => {
    if (!change.previousPath) return;
    await removeFilesUnderPrefix(change.previousPath);
    const orgFiles = await listOrgFiles(change.path);
    await Promise.all(orgFiles.map((file) => fileSearch.processFile(file.path)));
  };

  const handleDelete = async (change: FileSystemChange): Promise<void> => {
    if (!isOrgFile(change.path)) {
      await removeFilesUnderPrefix(change.path);
      return;
    }
    await fileSearch.removeFile({ path: splitPath(change.path) });
  };

  const isDirectoryRename = async (change: FileSystemChange): Promise<boolean> => {
    if (change.type !== 'rename' || !change.previousPath) return false;
    const pathInfo = await fileSystem.fileInfo(change.path);
    return (
      pathInfo?.type === 'directory' &&
      !isOrgFile(change.path) &&
      !isOrgFile(change.previousPath)
    );
  };

  const handleFileRename = async (change: FileSystemChange): Promise<void> => {
    if (change.previousPath && isOrgFile(change.previousPath)) {
      await fileSearch.removeFile({ path: splitPath(change.previousPath) });
    }
    if (isOrgFile(change.path)) await fileSearch.processFile(change.path);
  };

  const processFileChange = async (change: FileSystemChange): Promise<void> => {
    if (await isDirectoryRename(change)) {
      await handleDirectoryRename(change);
      return;
    }
    if (change.type === 'rename') {
      await handleFileRename(change);
      return;
    }
    if (change.type === 'delete') {
      await handleDelete(change);
      return;
    }
    await fileSearch.processFile(change.path);
  };

  const flushPendingChanges = async (): Promise<void> => {
    const change = pendingChanges.shift();
    if (!change) return;
    await processFileChange(change);
    await flushPendingChanges();
  };

  const handleFileChange = async (change: FileSystemChange): Promise<void> => {
    if (!affectsOrgIndex(change)) return;
    if (fileSearch.isIndexing) {
      pendingChanges.push(change);
      return;
    }
    await processFileChange(change);
  };

  const subscribeToFileChanges = (): void => {
    fileWatcher.watch('/', handleFileChange, { recursive: true });
  };

  watch(isIndexing, (isCurrentlyIndexing) => {
    if (isCurrentlyIndexing) return;
    void flushPendingChanges().catch((error: unknown) => {
      reportIndexingError(error, 'Failed to process pending file changes');
    });
  });

  watch(
    fsMounted,
    (isMounted) => {
      if (!isMounted) {
        pendingChanges.length = 0;
        return;
      }
      void commands.execute(DefaultCommands.INIT_SEARCH_INDEX).catch((error: unknown) => {
        reportIndexingError(error, 'Failed to initialize search index');
      });
    },
    { immediate: true },
  );

  if (isWatching.value) {
    subscribeToFileChanges();
    return;
  }
  const stop = watch(isWatching, (isActive) => {
    if (!isActive) return;
    stop();
    subscribeToFileChanges();
  });
};
