import {
  DEFAULT_FILE_SORT_CONFIG,
  getFileName,
  join,
  sortFiles,
  type DiskFile,
  type FileManagerStore,
  type FileSortConfig,
  type PendingFileOperation,
} from 'orgnote-api';
import { skipHydrate } from 'pinia';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { useFileSystemStore } from './file-system';
import { useFileSystemManagerStore } from './file-system-manager';
import { useFileWatcherStore } from './file-watcher';
import { getUniqueFileName } from 'src/utils/unique-file-name';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { isFilePath } from 'src/utils/is-file-path';
import { DEFAULT_FOLDER_NAME } from 'src/constants/default-folder-name';
import { debounce } from 'src/utils/debounce';
import { defineStorageBoundStore } from 'src/infrastructure/stores/storage-bound-store';

export const useFileManagerStore = defineStorageBoundStore<'file-manager', FileManagerStore>(
  'file-manager',
  () => {
    const path = ref<string>('/');
    const focusFile = shallowRef<DiskFile | undefined>();
    const searchQuery = ref<string>('');
    const mobileFileSearchActive = ref<boolean>(false);

    const files = ref<DiskFile[]>([]);
    const sortConfig = ref<FileSortConfig>({ ...DEFAULT_FILE_SORT_CONFIG });
    const sortedFiles = computed(() => sortFiles(files.value, sortConfig.value));

    const selectedFiles = skipHydrate(ref(new Set<string>()));

    const selectionMode = computed(() => selectedFiles.value.size > 0);

    const fs = useFileSystemStore();
    const fsManager = useFileSystemManagerStore();
    const fileWatcher = useFileWatcherStore();

    const focusDirPath = computed<string>(() => {
      if (!path.value) {
        return '/';
      }
      if (isFilePath(path.value)) {
        return getFileDirPath(path.value);
      }
      return path.value;
    });

    const operationTargets = computed<string[]>(() => {
      if (selectedFiles.value.size > 0) return [...selectedFiles.value];
      if (focusFile.value?.path) return [focusFile.value.path];
      return [];
    });

    const toggleSelection = (filePath: string): void => {
      const next = new Set(selectedFiles.value);
      const toggle = next.has(filePath) ? next.delete.bind(next) : next.add.bind(next);
      toggle(filePath);
      selectedFiles.value = next;
    };

    const selectFiles = (files: DiskFile[]): void => {
      selectedFiles.value = new Set(files.map((f) => f.path));
    };

    const clearSelection = (): void => {
      selectedFiles.value = new Set();
    };

    const pendingOperation = ref<PendingFileOperation | undefined>();
    let lastLoadRequestId = 0;

    const startCopy = (paths: string[]): void => {
      pendingOperation.value = { type: 'copy', paths };
      clearSelection();
    };

    const startMove = (paths: string[]): void => {
      pendingOperation.value = { type: 'move', paths };
      clearSelection();
    };

    const executePending = async (dest: string): Promise<void> => {
      if (!pendingOperation.value) return;
      const { type, paths } = pendingOperation.value;
      const execute = type === 'copy' ? copyFiles : moveFiles;
      await execute(paths, dest);
      pendingOperation.value = undefined;
    };

    const cancelPending = (): void => {
      pendingOperation.value = undefined;
    };

    const transferFiles = async (
      paths: string[],
      dest: string,
      operation: (src: string, dest: string) => Promise<void>,
    ): Promise<void> => {
      await Promise.all(paths.map((src) => operation(src, join(dest, getFileName(src)))));
      clearSelection();
    };

    const copyFiles = (paths: string[], dest: string) => transferFiles(paths, dest, fs.copyFile);
    const moveFiles = (paths: string[], dest: string) => transferFiles(paths, dest, fs.rename);

    const stopWatchingDir = (): void => {
      unwatchDir?.();
      unwatchDir = undefined;
    };

    const loadFiles = async (): Promise<void> => {
      const session = fsManager.currentSession;
      if (!session) return;
      const currentPath = path.value;
      const requestId = ++lastLoadRequestId;
      const nextFiles = await fs.readDir(currentPath);

      if (
        requestId !== lastLoadRequestId ||
        currentPath !== path.value ||
        fsManager.currentSession?.id !== session.id
      ) {
        return;
      }

      files.value = nextFiles;
    };

    const refreshFiles = debounce(() => void loadFiles(), 100);

    let unwatchDir: (() => void) | undefined;

    const handleDirectoryContextChange = ([currentPath, sessionId]: readonly [
      string,
      number | undefined,
    ]): void => {
      stopWatchingDir();
      if (!sessionId) {
        ++lastLoadRequestId;
        refreshFiles.cancel();
        return;
      }
      unwatchDir = fileWatcher.watch(currentPath, () => refreshFiles(), { recursive: false });
      void loadFiles();
    };

    watch(() => [path.value, fsManager.currentSession?.id] as const, handleDirectoryContextChange, {
      immediate: true,
    });

    onScopeDispose(() => {
      stopWatchingDir();
      refreshFiles.cancel();
    });

    const deleteFiles = async (paths: string[]): Promise<void> => {
      await Promise.all(paths.map((p) => fs.deleteFile(p)));
      clearSelection();
    };

    const createFile = async (p?: string): Promise<void> => {
      if (p) {
        await fs.writeFile(p, '');
        return;
      }
      const existingNames = files.value.map((f) => f.name);
      const fileName = getUniqueFileName(existingNames);
      await fs.writeFile(join(path.value, fileName), '');
    };

    const createFolder = async (p?: string): Promise<void> => {
      if (p) {
        await fs.mkdir(p);
        return;
      }
      const existingNames = files.value.map((f) => f.name);
      const folderName = getUniqueFileName(existingNames, '', DEFAULT_FOLDER_NAME);
      const folderPath = join(path.value, folderName);
      await fs.mkdir(folderPath);
    };

    const store: FileManagerStore = {
      path,
      focusFile,
      searchQuery,
      mobileFileSearchActive,
      focusDirPath,

      files,
      sortConfig,
      sortedFiles,
      loadFiles,

      selectionMode,
      selectedFiles,
      operationTargets,
      pendingOperation,
      toggleSelection,
      selectFiles,
      clearSelection,

      startCopy,
      startMove,
      executePending,
      cancelPending,

      copyFiles,
      moveFiles,
      deleteFiles,
      createFile,
      createFolder,
    };

    const $resetStorage = (): void => {
      ++lastLoadRequestId;
      refreshFiles.cancel();
      stopWatchingDir();
      path.value = '/';
      focusFile.value = undefined;
      searchQuery.value = '';
      mobileFileSearchActive.value = false;
      files.value = [];
      clearSelection();
      cancelPending();
    };

    return {
      ...store,
      $resetStorage,
    };
  },
);
