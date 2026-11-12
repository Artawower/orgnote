import { defineStore } from 'pinia';
import type {
  FileSystemStore,
  DiskFile,
  FileSystemChange,
  FileSystem,
  FileSystemSession,
} from 'orgnote-api';
import {
  ErrorFileNotFound,
  ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH,
  isOrgGpgFile,
  join,
  toAbsolutePath,
  toRelativePath,
} from 'orgnote-api';
import { computed, watch } from 'vue';
import { Platform } from 'quasar';
import { removeRelativePath } from 'src/utils/remove-relative-path';
import { mobileOnly } from 'src/utils/platform-specific';
import { getFileDirPath } from 'src/utils/get-file-dir-path';
import { storeToRefs } from 'pinia';
import { useFileSystemManagerStore } from './file-system-manager';
import { useFileWatcherStore } from './file-watcher';
import { useSettingsStore } from './settings';
import { reporter } from 'src/boot/report';
import { to } from 'orgnote-api/utils';
import { isNullable } from 'orgnote-api/utils';
import { isPathInsideRoot } from 'src/utils/is-path-inside-root';
import {
  runExclusiveForFile,
  runExclusiveForTrees,
} from 'src/infrastructure/file-systems/file-lock';
import { FileSystemChangedError } from 'src/infrastructure/file-systems/file-system-changed-error';

const EXTENSION_RUNTIME_ROOT = `/${ORGNOTE_EXTENSION_RUNTIME_ROOT_PATH}`;
const VAULT_ROOT = '/';

export const useFileSystemStore = defineStore<'file-system', FileSystemStore>(
  'file-system',
  () => {
    const fsManager = useFileSystemManagerStore();
    const { currentFs, currentFsInfo, currentSession } = storeToRefs(fsManager);
    const fileWatcher = useFileWatcherStore();

    const safeFs = computed(() => {
      if (!currentFs.value) {
        throw new Error('No file system selected');
      }
      return currentFs.value;
    });
    const settingsStore = useSettingsStore();

    watch(currentFsInfo, () => {
      if (settingsStore.settings.vault) {
        return;
      }
      settingsStore.settings.vault ??= currentFsInfo.value?.initialVault;
    });

    const normalizePath = (path: string | string[]): string => {
      path = removeRelativePaths(path);
      path = removeStartSlash(path);
      const stringPath = typeof path === 'string' ? path : join(...path);
      return getUserFilePath(stringPath);
    };

    const noVaultProvided = computed(() => isNullable(settingsStore.settings.vault));

    const prettyVault = computed(() => {
      if (noVaultProvided.value || !currentFs.value) {
        return '';
      }

      return currentFs.value.prettifyPath?.(settingsStore.settings.vault!) ?? '';
    });

    const removeRelativePaths = (path: string | string[]): string | string[] => {
      if (typeof path === 'string') {
        return removeRelativePath(path);
      }

      return path.map((p) => removeRelativePath(p));
    };

    const removeStartSlash = (path: string | string[]): string | string[] => {
      if (typeof path === 'string') {
        return toRelativePath(path);
      }
      return path.map(toRelativePath);
    };

    const getUserFilePath = (path: string): string => (path ? toAbsolutePath(path) : '');

    const readFile = async <T extends 'utf8' | 'binary'>(
      path: string | string[],
      encoding?: T,
    ): Promise<T extends 'utf8' ? string : Uint8Array> => {
      const normalizedPath = normalizePath(path);
      return await safeFs.value.readFile(normalizedPath, encoding);
    };

    type FileSystemTarget = { fs: FileSystem; session?: FileSystemSession };

    const captureFileSystemTarget = (): FileSystemTarget => ({
      fs: safeFs.value,
      session: currentSession.value ?? undefined,
    });

    const assertCurrentTarget = (target: FileSystemTarget, path: string): FileSystem => {
      const isSameTarget =
        currentFs.value === target.fs && currentSession.value?.id === target.session?.id;
      if (!isSameTarget) throw new FileSystemChangedError(path);
      return target.fs;
    };

    const runOnTarget = async <T>(
      target: FileSystemTarget,
      path: string,
      operation: (fs: FileSystem) => Promise<T>,
    ): Promise<T> => {
      const fs = assertCurrentTarget(target, path);
      if (!target.session) return operation(fs);
      const outcome = await fsManager.runWithMountedFileSystem(target.session, async (mountedFs) => ({
        value: await operation(mountedFs),
      }));
      if (!outcome) throw new FileSystemChangedError(path);
      return outcome.value;
    };

    const writeWith = async (
      fs: FileSystem,
      realPath: string,
      content: string | Uint8Array,
    ): Promise<FileSystemChange | undefined> => {
      const isEncrypted = isOrgGpgFile(realPath);
      const format = isEncrypted || content instanceof Uint8Array ? 'binary' : 'utf8';
      await fs.writeFile(realPath, content, format);
      if (isPathInsideRoot(realPath, EXTENSION_RUNTIME_ROOT)) return;
      const info = await fs.fileInfo(realPath);
      return { path: realPath, type: 'modify', mtime: info?.mtime };
    };

    const writeContent = (
      realPath: string,
      content: string | Uint8Array,
      target: FileSystemTarget,
    ): Promise<FileSystemChange | undefined> =>
      runOnTarget(target, realPath, (fs) => writeWith(fs, realPath, content));

    const notifyChange = async (change: FileSystemChange | undefined): Promise<void> => {
      if (!change) return;
      await fileWatcher.emitChange(change);
    };

    const persistFile = async (
      path: string | string[],
      content: string | Uint8Array,
    ): Promise<void> => {
      const realPath = normalizePath(path);
      const target = captureFileSystemTarget();
      const change = await runExclusiveForFile(realPath, () =>
        writeContent(realPath, content, target),
      );
      await notifyChange(change);
    };

    const syncFile = async <T extends string | Uint8Array>(
      path: string | string[],
      content: T,
      time: number,
    ): Promise<T | undefined> => {
      const realPath = normalizePath(path);
      const previousFileInfo = await safeFs.value.fileInfo(realPath);
      const hasLocalChanges = Boolean(previousFileInfo && previousFileInfo.mtime > time);

      if (hasLocalChanges) {
        const format = content instanceof Uint8Array ? 'binary' : 'utf8';
        return (await safeFs.value.readFile(realPath, format)) as T;
      }

      const isUpToDate = Boolean(previousFileInfo && previousFileInfo.mtime === time);
      if (isUpToDate) {
        return;
      }

      const dirExists = await currentFs.value!.isDirExist(getFileDirPath(realPath));

      if (!dirExists) {
        await currentFs.value!.mkdir(getFileDirPath(realPath));
      }

      await persistFile(realPath, content);
    };

    const rename = async (path: string | string[], newPath: string | string[]): Promise<void> => {
      const previousPath = normalizePath(path);
      const realPath = normalizePath(newPath);
      const target = captureFileSystemTarget();
      await runExclusiveForTrees([previousPath, realPath], () =>
        runOnTarget(target, previousPath, (fs) => fs.rename(previousPath, realPath)),
      );
      const info = await safeFs.value.fileInfo(realPath);
      await fileWatcher.emitChange({
        path: realPath,
        type: 'rename',
        previousPath,
        mtime: info?.mtime,
      });
    };

    const deleteFile = async (path: string | string[]) => {
      const realPath = normalizePath(path);
      const target = captureFileSystemTarget();
      await runExclusiveForTrees([realPath], () =>
        runOnTarget(target, realPath, (fs) => fs.deleteFile(realPath)),
      );
      await fileWatcher.emitChange({ path: realPath, type: 'delete' });
    };

    const removeAllFiles = () => {
      const target = captureFileSystemTarget();
      return runExclusiveForTrees([VAULT_ROOT], () =>
        runOnTarget(target, VAULT_ROOT, async (fs) => {
          await mobileOnly(async () => await fs.rmdir(VAULT_ROOT))();
          return await fs.wipe?.();
        }),
      );
    };

    const initFolderForFile = async (filePath: string | string[], isDir = false): Promise<void> => {
      if (noVaultProvided.value) {
        return;
      }
      const realPath = normalizePath(filePath);
      const dirPath = isDir ? realPath : getFileDirPath(realPath) || '';
      const isDirExist = await safeFs.value.isDirExist(dirPath);
      if (isDirExist) {
        return;
      }

      const safeMkdir = to(safeFs.value.mkdir, `Failed to create ${filePath} directory`);

      await safeMkdir(dirPath).mapErr((e) => {
        reporter.reportError(e);
      });
    };

    const mkdir = async (path: string | string[]): Promise<void> => {
      const realPath = normalizePath(path);
      await safeFs.value.mkdir(realPath);
    };

    const rmdir = async (path: string | string[]): Promise<void> => {
      const realPath = normalizePath(path);
      const target = captureFileSystemTarget();
      await runExclusiveForTrees([realPath], () =>
        runOnTarget(target, realPath, (fs) => fs.rmdir(realPath)),
      );
    };

    const fileInfo = async (path: string | string[]): Promise<DiskFile | undefined> => {
      const fileInfo = await safeFs.value.fileInfo(normalizePath(path));

      if (!fileInfo) {
        return;
      }

      return fileInfo;
    };

    const readDir = async (path: string | string[] = ''): Promise<DiskFile[]> => {
      if (noVaultProvided.value) {
        return [];
      }

      const res = await safeFs.value.readDir(normalizePath(path));
      return res;
    };

    const copyFile = async (src: string | string[], dest: string | string[]): Promise<void> => {
      const srcPath = normalizePath(src);
      const destPath = normalizePath(dest);

      const srcInfo = await safeFs.value.fileInfo(srcPath);
      if (srcInfo?.type === 'directory') {
        await copyDir(srcPath, destPath);
        return;
      }

      if (safeFs.value.copyFile) {
        await safeFs.value.copyFile(srcPath, destPath);
        return;
      }

      const content = await safeFs.value.readFile(srcPath, 'binary');
      await safeFs.value.writeFile(destPath, content, 'binary');
    };

    const copyDir = async (srcDir: string, destDir: string): Promise<void> => {
      await safeFs.value.mkdir(destDir);
      const entries = await safeFs.value.readDir(srcDir);
      // TODO: Could be optimized via queue
      await Promise.all(
        entries.map((entry) => {
          const srcChild = join(srcDir, entry.name);
          const destChild = join(destDir, entry.name);
          if (entry.type === 'directory') {
            return copyDir(srcChild, destChild);
          }
          return copySingleFile(srcChild, destChild);
        }),
      );
    };

    const copySingleFile = async (srcPath: string, destPath: string): Promise<void> => {
      if (safeFs.value.copyFile) {
        return await safeFs.value.copyFile(srcPath, destPath);
      }
      const content = await safeFs.value.readFile(srcPath, 'binary');
      await safeFs.value.writeFile(destPath, content, 'binary');
    };

    function withSafeFolderCreation<PATH extends string | string[], A extends unknown[], R>(
      fn: (p: PATH, ...args: A) => Promise<R>,
      isDir: boolean,
      defaultValue: R,
    ): (path?: PATH, ...args: A) => Promise<R>;
    function withSafeFolderCreation<PATH extends string | string[], A extends unknown[], R>(
      fn: (p: PATH, ...args: A) => Promise<R>,
      isDir?: boolean,
    ): (path?: PATH, ...args: A) => Promise<R | undefined>;
    function withSafeFolderCreation<PATH extends string | string[], A extends unknown[], R>(
      fn: (p: PATH, ...args: A) => Promise<R>,
      isDir = false,
      defaultValue?: R,
    ) {
      return async (path?: PATH, ...args: A): Promise<R | undefined> => {
        if (!currentFs.value || !path) {
          return defaultValue;
        }
        const res = await to(fn)(path, ...args);
        if (res.isOk()) {
          return res.value;
        }
        if (!(res.error instanceof ErrorFileNotFound)) {
          throw res.error;
        }
        await initFolderForFile(path, isDir);
        return await fn(path, ...args);
      };
    }

    const dropFileSystem = async () => {
      // NOTE: ignore native mobile file system.
      if (Platform.is.nativeMobile) {
        return;
      }
      if (!currentFs.value) return;
      const target = captureFileSystemTarget();
      await runExclusiveForTrees([VAULT_ROOT], () =>
        runOnTarget(target, VAULT_ROOT, (fs) => fs.rmdir(VAULT_ROOT)),
      );
    };

    const writeFile: FileSystemStore['writeFile'] = async (path, content) => {
      await persistFile(path, content);
    };

    type FileTransformResult = { isWritten: boolean; change?: FileSystemChange };

    const readContentOrEmpty = async (
      fs: FileSystem,
      realPath: string,
    ): Promise<Uint8Array | undefined> => {
      const result = await to(() => fs.readFile(realPath, 'binary'))();
      if (result.isOk()) return result.value;
      if (result.error instanceof ErrorFileNotFound) return;
      throw result.error;
    };

    const transformContent = (
      realPath: string,
      transform: (content: Uint8Array) => Promise<Uint8Array | undefined>,
      target: FileSystemTarget,
    ): Promise<FileTransformResult> =>
      runOnTarget(target, realPath, async (fs) => {
        const content = await readContentOrEmpty(fs, realPath);
        const nextContent = await transform(content ?? new Uint8Array());
        if (!nextContent) return { isWritten: false };
        if (!content) await initFolderForFile(realPath);
        return { isWritten: true, change: await writeWith(fs, realPath, nextContent) };
      });

    const updateFile: FileSystemStore['updateFile'] = async (path, transform) => {
      const realPath = normalizePath(path);
      const target = captureFileSystemTarget();
      const result = await runExclusiveForFile(realPath, () =>
        transformContent(realPath, transform, target),
      );
      await notifyChange(result.change);
      return result.isWritten;
    };

    const store: FileSystemStore = {
      readFile: withSafeFolderCreation(readFile),
      writeFile: withSafeFolderCreation(writeFile),
      syncFile: withSafeFolderCreation(syncFile),
      updateFile,
      rename: withSafeFolderCreation(rename),
      deleteFile: withSafeFolderCreation(deleteFile),
      removeAllFiles,
      mkdir: withSafeFolderCreation(mkdir),
      rmdir: withSafeFolderCreation(rmdir, true),
      fileInfo: withSafeFolderCreation(fileInfo),
      readDir: withSafeFolderCreation(readDir, false, []),
      copyFile: withSafeFolderCreation(copyFile),
      dropFileSystem,
      prettyVault,
    };

    return store;
  },
  {
    persist: {
      pick: ['vault'],
    },
  },
);
