import { defineStore } from 'pinia';
import { ref, shallowRef, watch as watchSource } from 'vue';
import {
  to,
  type DiskFile,
  type FileSystemChange,
  type FileSystemChangeType,
  type FileWatcherListener,
  type FileWatcherStartOptions,
  type FileWatcherStore,
  type FileWatcherWatchOptions,
} from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useFileSystemStore } from './file-system';
import { reporter } from 'src/boot/report';
import { recordConfigFileChangeEvent } from 'src/infrastructure/config/config-lifecycle-record';
import {
  createFileWatcherRuntime,
  type FileWatcherScanResult,
  type PathFilter,
} from 'src/infrastructure/file-systems/file-watcher-runtime';
import { createLocalChangeFilter } from 'src/infrastructure/file-systems/local-change-filter';

type Snapshot = Map<string, number>;

interface PathSubscription {
  path: string;
  listener: FileWatcherListener;
  recursive: boolean;
}


const createChange = (
  path: string,
  type: FileSystemChangeType,
  mtime?: number,
): FileSystemChange => ({ path, type, mtime });

const detectCreatedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...current.entries()]
    .filter(([path]) => !previous.has(path))
    .map(([path, mtime]) => createChange(path, 'create', mtime));

const detectModifiedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...current.entries()]
    .filter(([path, mtime]) => {
      const prevMtime = previous.get(path);
      return prevMtime !== undefined && prevMtime !== mtime;
    })
    .map(([path, mtime]) => createChange(path, 'modify', mtime));

const detectDeletedFiles = (current: Snapshot, previous: Snapshot): FileSystemChange[] =>
  [...previous.keys()]
    .filter((path) => !current.has(path))
    .map((path) => createChange(path, 'delete'));

const computeChanges = (current: Snapshot, previous: Snapshot): FileSystemChange[] => [
  ...detectCreatedFiles(current, previous),
  ...detectModifiedFiles(current, previous),
  ...detectDeletedFiles(current, previous),
];

const fileToSnapshotEntry = (file: DiskFile): [string, number] => [file.path, file.mtime];

const applyPathFilter = (files: DiskFile[], filter?: PathFilter): DiskFile[] =>
  filter ? files.filter((file) => filter(file.path)) : files;

const getDirectories = (files: DiskFile[]): DiskFile[] =>
  files.filter((f) => f.type === 'directory');

const addFilesToSnapshot = (snapshot: Snapshot, files: DiskFile[], filter?: PathFilter): void => {
  applyPathFilter(files, filter).forEach((file) => {
    const [path, mtime] = fileToSnapshotEntry(file);
    snapshot.set(path, mtime);
  });
};

const scanDirectory = async (
  fs: ReturnType<typeof useFileSystemStore>,
  dirPath: string,
  snapshot: Snapshot,
  filter?: PathFilter,
): Promise<void> => {
  const files = await fs.readDir(dirPath);
  addFilesToSnapshot(snapshot, files, filter);

  const directories = getDirectories(files);
  await Promise.all(directories.map((dir) => scanDirectory(fs, dir.path, snapshot, filter)));
};

const buildSnapshot = async (
  fs: ReturnType<typeof useFileSystemStore>,
  filter?: PathFilter,
): Promise<Snapshot> => {
  const snapshot = new Map<string, number>();
  await scanDirectory(fs, '/', snapshot, filter);
  return snapshot;
};

const isFirstLevelChild = (changePath: string, watchPath: string): boolean => {
  const relativePath = changePath.slice(watchPath.length);
  return !relativePath.includes('/');
};

const isPathMatch = (changePath: string, watchPath: string, recursive: boolean): boolean => {
  if (changePath === watchPath) return true;
  const normalizedWatchPath = watchPath.endsWith('/') ? watchPath : `${watchPath}/`;
  const isInside = changePath.startsWith(normalizedWatchPath);
  if (!isInside) return false;
  if (recursive) return true;
  return isFirstLevelChild(changePath, normalizedWatchPath);
};

const findMatchingSubscriptions = (
  change: FileSystemChange,
  subscriptions: PathSubscription[],
): PathSubscription[] =>
  subscriptions.filter((sub) => isPathMatch(change.path, sub.path, sub.recursive));


export const useFileWatcherStore = defineStore<'file-watcher', FileWatcherStore>(
  'file-watcher',
  () => {
    const fsManager = useFileSystemManagerStore();
    const fs = useFileSystemStore();

    const isWatching = ref(false);
    const snapshot = shallowRef<Snapshot>(new Map());
    const subscriptions = ref<PathSubscription[]>([]);
    const localChanges = createLocalChangeFilter();

    const notifySubscribers = async (change: FileSystemChange): Promise<void> => {
      const matching = findMatchingSubscriptions(change, subscriptions.value);
      for (const sub of matching) {
        const result = await to(() => Promise.resolve(sub.listener(change)))();
        if (result.isErr()) reporter.reportError(result.error);
      }
    };

    const notifyNativeChangeSafely = async (change: FileSystemChange): Promise<void> => {
      const result = await to(
        () => notifySubscribers(change),
        (error) => error instanceof Error ? error : new Error('file watcher native notify failed'),
      )();
      if (result.isOk()) return;
      reporter.reportError(result.error);
    };

    const handleNativeChange = (change: FileSystemChange): void => {
      if (localChanges.isDuplicate(change)) return;
      recordConfigFileChangeEvent('native', change);
      void notifyNativeChangeSafely(change);
    };

    const performScan = async (
      filter: PathFilter | undefined,
      isCurrent: () => boolean,
    ): Promise<FileWatcherScanResult | null> => {
      const previousSnapshot = snapshot.value;
      const currentSnapshot = await buildSnapshot(fs, filter);
      if (!isCurrent()) return null;

      const detected = computeChanges(currentSnapshot, previousSnapshot);
      snapshot.value = currentSnapshot;
      for (const change of detected) {
        recordConfigFileChangeEvent('poll', change);
        await notifySubscribers(change);
      }

      return {
        changes: detected.length,
        files: currentSnapshot.size,
      };
    };

    const recordSnapshot = (change: FileSystemChange): void => {
      if (change.type === 'delete') {
        const updated = new Map(snapshot.value);
        updated.delete(change.path);
        snapshot.value = updated;
        return;
      }
      if (change.mtime === undefined) return;
      const updated = new Map(snapshot.value);
      updated.set(change.path, change.mtime);
      snapshot.value = updated;
    };

    const emitChange = async (change: FileSystemChange): Promise<void> => {
      recordConfigFileChangeEvent('explicit', change);
      localChanges.remember(change);
      await notifySubscribers(change);
      recordSnapshot(change);
    };

    const onInvalidate = (): void => {
      snapshot.value = new Map();
      localChanges.clear();
    };

    const runtime = createFileWatcherRuntime({
      getSession: () => fsManager.currentSession,
      runWithMountedFileSystem: fsManager.runWithMountedFileSystem,
      scan: performScan,
      onNativeChange: handleNativeChange,
      shouldRun: () => isWatching.value,
      onInvalidate,
    });

    const start = async (options: FileWatcherStartOptions = {}): Promise<void> => {
      if (isWatching.value && runtime.isActive()) return;
      isWatching.value = true;
      await runtime.start(options);
    };

    const restart = async (options?: FileWatcherStartOptions): Promise<void> => {
      await runtime.restart(options);
    };

    const stop = async (): Promise<void> => {
      await runtime.stop();
      isWatching.value = false;
      subscriptions.value = [];
    };

    const watch = (
      path: string,
      listener: FileWatcherListener,
      options: FileWatcherWatchOptions = {},
    ): (() => void) => {
      const subscription: PathSubscription = {
        path,
        listener,
        recursive: options.recursive ?? false,
      };

      subscriptions.value = [...subscriptions.value, subscription];

      return () => {
        subscriptions.value = subscriptions.value.filter((s) => s !== subscription);
      };
    };

    const restartSafely = async (): Promise<void> => {
      const result = await to(
        restart,
        (error) => error instanceof Error ? error : new Error('file watcher restart failed'),
      )();
      if (result.isOk()) return;
      reporter.reportError(result.error);
    };

    watchSource(
      () => fsManager.currentSession,
      (newSession) => {
        if (!newSession) {
          runtime.invalidate();
          return;
        }
        if (!isWatching.value) return;
        void restartSafely();
      },
      { flush: 'sync' },
    );

    const store: FileWatcherStore = {
      isWatching,
      start,
      restart,
      stop,
      watch,
      emitChange,
    };

    return store;
  },
);
