import type { BrowserWindow, OpenDialogOptions } from 'electron';
import { dialog, ipcMain } from 'electron';
import chokidar, { type FSWatcher } from 'chokidar';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { DiskFile, FileSystemChange } from 'orgnote-api';
import { ELECTRON_FS_CHANNELS } from './electron-fs-channels';

const WATCH_EVENT_NAMES = ['add', 'addDir', 'change', 'unlink', 'unlinkDir'] as const;
type WatchEventName = (typeof WATCH_EVENT_NAMES)[number];

interface RegisterElectronFsIpcOptions {
  getMainWindow: () => BrowserWindow | undefined;
}

interface WatchEntry {
  watcher: FSWatcher;
}

interface ElectronFsIpcRuntime {
  register: () => void;
  stopWatchers: () => Promise<void>;
}

const toUnixPath = (value: string): string => value.split(path.sep).join('/');

const stripRootSlash = (logicalPath: string): string => logicalPath.replace(/^\/+/, '');

const selectDirectory = async (window?: BrowserWindow): Promise<string | undefined> => {
  const options: OpenDialogOptions = { properties: ['openDirectory', 'createDirectory'] };
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);
  if (result.canceled) return undefined;
  return result.filePaths[0];
};

const createElectronFsIpcRuntime = (
  options: RegisterElectronFsIpcOptions,
): ElectronFsIpcRuntime => {
  let rootPath: string | undefined;
  let rootRealPath: string | undefined;
  let nextWatchId = 1;
  const watchers = new Map<number, WatchEntry>();

  const isInsideRoot = (absolutePath: string): boolean => {
    if (!rootRealPath) return false;
    const relativePath = path.relative(rootRealPath, absolutePath);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  };

  const toLogicalPath = (absolutePath: string): string => {
    if (!rootRealPath) throw new Error('Electron filesystem is not mounted');
    const relativePath = path.relative(rootRealPath, absolutePath);
    if (!relativePath) return '/';
    return `/${toUnixPath(relativePath)}`;
  };

  const resolveInsideRoot = (logicalPath: string): string => {
    if (!rootPath || !rootRealPath) throw new Error('Electron filesystem is not mounted');
    const resolvedPath = path.resolve(rootPath, stripRootSlash(logicalPath));
    if (!isInsideRoot(resolvedPath)) throw new Error(`Path escapes vault: ${logicalPath}`);
    return resolvedPath;
  };

  const assertInsideRoot = (absolutePath: string, logicalPath: string): void => {
    if (isInsideRoot(absolutePath)) return;
    throw new Error(`Path escapes vault: ${logicalPath}`);
  };

  const resolveExistingInsideRoot = async (logicalPath: string): Promise<string> => {
    const resolvedPath = resolveInsideRoot(logicalPath);
    const realPath = await fs.realpath(resolvedPath);
    assertInsideRoot(realPath, logicalPath);
    return realPath;
  };

  const findExistingAncestor = async (absolutePath: string): Promise<string> => {
    const realPath = await fs.realpath(absolutePath).catch(() => undefined);
    if (realPath) return realPath;
    const parentPath = path.dirname(absolutePath);
    if (parentPath === absolutePath) throw new Error('Unable to resolve vault path ancestor');
    return findExistingAncestor(parentPath);
  };

  const resolveWritableInsideRoot = async (logicalPath: string): Promise<string> => {
    const resolvedPath = resolveInsideRoot(logicalPath);
    const realPath = await fs.realpath(resolvedPath).catch(() => undefined);
    if (realPath) {
      assertInsideRoot(realPath, logicalPath);
      return realPath;
    }

    const ancestorRealPath = await findExistingAncestor(path.dirname(resolvedPath));
    assertInsideRoot(ancestorRealPath, logicalPath);
    return resolvedPath;
  };

  const toDiskFile = (absolutePath: string, stat: Awaited<ReturnType<typeof fs.stat>>): DiskFile => ({
    name: path.basename(absolutePath),
    path: toLogicalPath(absolutePath),
    type: stat.isDirectory() ? 'directory' : 'file',
    size: Number(stat.size),
    atime: Number(stat.atimeMs),
    ctime: Number(stat.ctimeMs),
    mtime: Number(stat.mtimeMs),
    uri: absolutePath,
  });

  const mountRoot = async (root: string): Promise<boolean> => {
    const realPath = await fs.realpath(root);
    const stat = await fs.stat(realPath);
    if (!stat.isDirectory()) throw new Error(`Vault root is not a directory: ${root}`);
    rootPath = root;
    rootRealPath = realPath;
    return true;
  };

  const readFile = async (logicalPath: string, encoding: 'utf8' | 'binary' = 'utf8') => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    if (encoding === 'binary') return fs.readFile(resolvedPath);
    return fs.readFile(resolvedPath, 'utf8');
  };

  const writeFile = async (
    logicalPath: string,
    content: string | Uint8Array,
    encoding?: BufferEncoding,
  ): Promise<void> => {
    const resolvedPath = await resolveWritableInsideRoot(logicalPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, content, encoding);
  };

  const toSafeDiskFile = async (absolutePath: string): Promise<DiskFile | undefined> => {
    const realPath = await fs.realpath(absolutePath);
    if (!isInsideRoot(realPath)) return undefined;
    const stat = await fs.stat(realPath);
    return toDiskFile(absolutePath, stat);
  };

  const readDir = async (logicalPath: string): Promise<DiskFile[]> => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    const entries = await fs.readdir(resolvedPath);
    const files = await Promise.all(
      entries.map((entry) => toSafeDiskFile(path.join(resolvedPath, entry))),
    );
    return files.filter((file): file is DiskFile => Boolean(file));
  };

  const fileInfo = async (logicalPath: string): Promise<DiskFile | undefined> => {
    const resolvedPath = resolveInsideRoot(logicalPath);
    return toSafeDiskFile(resolvedPath).catch(() => undefined);
  };

  const rename = async (logicalPath: string, nextLogicalPath: string): Promise<void> => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    const nextPath = await resolveWritableInsideRoot(nextLogicalPath);
    await fs.mkdir(path.dirname(nextPath), { recursive: true });
    await fs.rename(resolvedPath, nextPath);
  };

  const deleteFile = async (logicalPath: string): Promise<void> => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    await fs.rm(resolvedPath, { force: false });
  };

  const rmdir = async (logicalPath: string): Promise<void> => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    await fs.rm(resolvedPath, { recursive: true, force: false });
  };

  const mkdir = async (logicalPath: string): Promise<void> => {
    const resolvedPath = await resolveWritableInsideRoot(logicalPath);
    await fs.mkdir(resolvedPath, { recursive: true });
  };

  const utime = async (
    logicalPath: string,
    atime?: string | number | Date,
    mtime?: string | number | Date,
  ): Promise<void> => {
    const resolvedPath = await resolveExistingInsideRoot(logicalPath);
    await fs.utimes(resolvedPath, atime ? new Date(atime) : new Date(), mtime ? new Date(mtime) : new Date());
  };

  const copyFile = async (src: string, dest: string): Promise<void> => {
    const srcPath = await resolveExistingInsideRoot(src);
    const destPath = await resolveWritableInsideRoot(dest);
    await fs.copyFile(srcPath, destPath);
  };

  const buildWatchChange = async (
    eventName: WatchEventName,
    absolutePath: string,
  ): Promise<FileSystemChange | undefined> => {
    if (!isInsideRoot(absolutePath)) return undefined;
    const type = eventName === 'change' ? 'modify' : eventName.startsWith('unlink') ? 'delete' : 'create';
    const stat = type === 'delete' ? undefined : await fs.stat(absolutePath).catch(() => undefined);
    return {
      path: toLogicalPath(absolutePath),
      type,
      mtime: stat?.mtimeMs,
    };
  };

  const sendWatchEvent = (window: BrowserWindow | undefined, watchId: number, change: FileSystemChange): void => {
    window?.webContents.send(ELECTRON_FS_CHANNELS.watchEvent, { watchId, change });
  };

  const watchStart = (): number => {
    if (!rootRealPath) throw new Error('Electron filesystem is not mounted');
    const watchId = nextWatchId++;
    const watcher = chokidar.watch(rootRealPath, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });
    const handleChange = (eventName: WatchEventName) => {
      watcher.on(eventName, (changedPath) => {
        void buildWatchChange(eventName, changedPath).then((change) => {
          if (!change) return;
          sendWatchEvent(options.getMainWindow(), watchId, change);
        });
      });
    };
    WATCH_EVENT_NAMES.forEach(handleChange);
    watchers.set(watchId, { watcher });
    return watchId;
  };

  const watchStop = async (watchId: number): Promise<void> => {
    const entry = watchers.get(watchId);
    if (!entry) return;
    watchers.delete(watchId);
    await entry.watcher.close();
  };

  const register = (): void => {
    ipcMain.handle(ELECTRON_FS_CHANNELS.selectDirectory, () => selectDirectory(options.getMainWindow()));
    ipcMain.handle(ELECTRON_FS_CHANNELS.mountRoot, (_event, root: string) => mountRoot(root));
    ipcMain.handle(ELECTRON_FS_CHANNELS.readFile, (_event, logicalPath: string, encoding?: 'utf8' | 'binary') =>
      readFile(logicalPath, encoding),
    );
    ipcMain.handle(ELECTRON_FS_CHANNELS.writeFile, (_event, logicalPath: string, content: string | Uint8Array, encoding?: BufferEncoding) =>
      writeFile(logicalPath, content, encoding),
    );
    ipcMain.handle(ELECTRON_FS_CHANNELS.readDir, (_event, logicalPath: string) => readDir(logicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.fileInfo, (_event, logicalPath: string) => fileInfo(logicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.rename, (_event, logicalPath: string, nextLogicalPath: string) => rename(logicalPath, nextLogicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.deleteFile, (_event, logicalPath: string) => deleteFile(logicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.rmdir, (_event, logicalPath: string) => rmdir(logicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.mkdir, (_event, logicalPath: string) => mkdir(logicalPath));
    ipcMain.handle(ELECTRON_FS_CHANNELS.utime, (_event, logicalPath: string, atime?: string | number | Date, mtime?: string | number | Date) =>
      utime(logicalPath, atime, mtime),
    );
    ipcMain.handle(ELECTRON_FS_CHANNELS.copyFile, (_event, src: string, dest: string) => copyFile(src, dest));
    ipcMain.handle(ELECTRON_FS_CHANNELS.watchStart, watchStart);
    ipcMain.handle(ELECTRON_FS_CHANNELS.watchStop, (_event, watchId: number) => watchStop(watchId));
  };

  const stopWatchers = async (): Promise<void> => {
    await Promise.all([...watchers.keys()].map(watchStop));
  };

  return { register, stopWatchers };
};

let runtime: ElectronFsIpcRuntime | undefined;

export const registerElectronFsIpc = (options: RegisterElectronFsIpcOptions): void => {
  runtime = createElectronFsIpcRuntime(options);
  runtime.register();
};

export const stopElectronFsWatchers = async (): Promise<void> => {
  await runtime?.stopWatchers();
};
