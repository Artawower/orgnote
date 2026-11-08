import {
  to,
  type FileSystem,
  type FileSystemChange,
  type FileSystemSession,
  type FileWatcherStartOptions,
  type WatcherHandle,
} from 'orgnote-api';
import { reporter } from 'src/boot/report';

export type PathFilter = (path: string) => boolean;

export interface FileWatcherScanResult {
  changes: number;
  files: number;
}

export interface FileWatcherRuntimeDependencies {
  getSession: () => FileSystemSession | null;
  runWithMountedFileSystem: <T>(
    session: FileSystemSession,
    operation: (fs: FileSystem) => Promise<T>,
  ) => Promise<T | undefined>;
  scan: (
    filter: PathFilter | undefined,
    isCurrent: () => boolean,
  ) => Promise<FileWatcherScanResult | null>;
  onNativeChange: (change: FileSystemChange) => void;
  shouldRun: () => boolean;
  onInvalidate?: () => void;
}

export interface FileWatcherRuntime {
  start: (options?: FileWatcherStartOptions) => Promise<void>;
  restart: (options?: FileWatcherStartOptions) => Promise<void>;
  stop: () => Promise<void>;
  invalidate: () => void;
  isActive: () => boolean;
}

const DEFAULT_INTERVAL = 3000;
const BACKOFF_MULTIPLIER = 2;
const MAX_BACKOFF_MULTIPLIER = 8;

const isValidInterval = (value?: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normalizeInterval = (interval?: number): number => {
  if (isValidInterval(interval)) return interval;
  if (interval === undefined) return DEFAULT_INTERVAL;
  reporter.reportWarning(new Error('file watcher invalid interval'));
  return DEFAULT_INTERVAL;
};

const normalizeFileFilter = (filter?: PathFilter): PathFilter | undefined => {
  if (!filter) return undefined;
  if (typeof filter === 'function') return filter;
  reporter.reportWarning(new Error('file watcher invalid file filter'));
  return undefined;
};

const normalizeStartOptions = (options: FileWatcherStartOptions): FileWatcherStartOptions => ({
  ...options,
  interval: normalizeInterval(options.interval),
  fileFilter: normalizeFileFilter(options.fileFilter),
});

export const createFileWatcherRuntime = (
  deps: FileWatcherRuntimeDependencies,
): FileWatcherRuntime => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let nativeWatcherHandle: WatcherHandle | null = null;
  let inFlightNativeStop: Promise<void> | null = null;
  let nativeStopGeneration = 0;
  let currentOptions: FileWatcherStartOptions = {};
  let isScanning = false;
  let idleScans = 0;
  let currentInterval = DEFAULT_INTERVAL;
  let baseInterval = DEFAULT_INTERVAL;
  let maxInterval = DEFAULT_INTERVAL * MAX_BACKOFF_MULTIPLIER;
  let runtimeGeneration = 0;
  let runtimeActive = false;

  const nextRuntimeGeneration = (): number => {
    runtimeGeneration += 1;
    return runtimeGeneration;
  };

  const isCurrentGeneration = (generation: number): boolean => generation === runtimeGeneration;

  const matchesFilter = (path: string): boolean => {
    if (!currentOptions.fileFilter) return true;
    return currentOptions.fileFilter(path);
  };

  const onNativeChange = (change: FileSystemChange, generation: number): void => {
    if (!isCurrentGeneration(generation) || !matchesFilter(change.path)) return;
    deps.onNativeChange(change);
  };

  const isWatchContextValid = (session: FileSystemSession, generation: number): boolean =>
    isCurrentGeneration(generation) &&
    runtimeActive &&
    deps.getSession()?.id === session.id;

  const startNativeWatch = async (generation: number): Promise<boolean> => {
    const session = deps.getSession();
    if (!session) return false;
    const rawFs = session.fs;
    const watch = rawFs.watch;
    if (!watch) return false;
    const boundWatch = watch.bind(rawFs);
    const rawRoot = session.root;

    const result = await deps.runWithMountedFileSystem(session, async () => {
      if (!isWatchContextValid(session, generation)) return false;
      const handle = await boundWatch(
        (change) => onNativeChange(change, generation),
        { root: rawRoot },
      );
      if (!isWatchContextValid(session, generation)) {
        await handle.stop();
        return true;
      }
      nativeWatcherHandle = handle;
      return true;
    });
    return result ?? false;
  };

  const buildScanResult = async (
    generation: number,
  ): Promise<FileWatcherScanResult | null> => {
    const result = await to(() =>
      deps.scan(currentOptions.fileFilter, () => isCurrentGeneration(generation)),
    )();
    if (result.isOk()) return result.value;
    reporter.reportResult(result, 'file watcher scan failed');
    return null;
  };

  const scan = async (generation: number): Promise<number | null> => {
    if (isScanning) return null;
    isScanning = true;
    const result = await buildScanResult(generation);
    if (isCurrentGeneration(generation)) {
      isScanning = false;
    }
    if (!result || !isCurrentGeneration(generation)) {
      return null;
    }
    return result.changes;
  };

  const updateInterval = (changes: number | null): void => {
    if (changes && changes > 0) {
      idleScans = 0;
      currentInterval = baseInterval;
      return;
    }
    idleScans += 1;
    currentInterval = Math.min(baseInterval * BACKOFF_MULTIPLIER ** idleScans, maxInterval);
  };

  const scheduleNext = (delay: number, generation: number): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const changes = await scan(generation);
      if (!isCurrentGeneration(generation) || !runtimeActive) return;
      updateInterval(changes);
      scheduleNext(currentInterval, generation);
    }, delay);
  };

  const startPolling = (generation: number): void => {
    baseInterval = currentOptions.interval ?? DEFAULT_INTERVAL;
    maxInterval = baseInterval * MAX_BACKOFF_MULTIPLIER;
    currentInterval = baseInterval;
    idleScans = 0;
    scheduleNext(0, generation);
  };

  const canStartRuntime = (): boolean => Boolean(deps.getSession());

  const startRuntimeForGeneration = async (generation: number): Promise<void> => {
    const nativeStarted = await startNativeWatch(generation);
    if (!isCurrentGeneration(generation) || !runtimeActive) return;
    if (nativeStarted) return;
    startPolling(generation);
  };

  const resetFailedRuntimeStart = (generation: number): void => {
    if (!isCurrentGeneration(generation)) return;
    runtimeActive = false;
  };

  const startRuntime = async (): Promise<void> => {
    if (runtimeActive || !canStartRuntime()) return;
    const generation = runtimeGeneration;
    runtimeActive = true;
    const result = await to(() => startRuntimeForGeneration(generation))();
    if (result.isOk()) return;
    resetFailedRuntimeStart(generation);
    throw result.error;
  };

  const handleStopError = (error: unknown): void => {
    reporter.reportError(
      error instanceof Error ? error : new Error('file watcher stop native failed'),
    );
  };

  const executeNativeStop = async (
    handle: WatcherHandle,
    generation: number,
  ): Promise<void> => {
    const result = await to(async () => {
      await handle.stop();
    })();
    if (generation === nativeStopGeneration) inFlightNativeStop = null;
    if (result.isErr()) throw result.error;
  };

  const createInFlightStop = (handle: WatcherHandle): Promise<void> => {
    nativeStopGeneration += 1;
    const stopPromise = executeNativeStop(handle, nativeStopGeneration);
    inFlightNativeStop = stopPromise;
    return stopPromise;
  };

  const stopNativeWatch = (): Promise<void> => {
    if (!nativeWatcherHandle) {
      return inFlightNativeStop ?? Promise.resolve();
    }
    const handle = nativeWatcherHandle;
    nativeWatcherHandle = null;
    return createInFlightStop(handle);
  };

  const stopPolling = (): void => {
    if (!timeoutId) return;
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  const stopNativeWatchSafely = async (): Promise<void> => {
    const result = await to(stopNativeWatch)();
    if (result.isErr()) handleStopError(result.error);
  };

  const invalidateRuntime = (): void => {
    nextRuntimeGeneration();
    stopPolling();
    runtimeActive = false;
    isScanning = false;
    deps.onInvalidate?.();
    void stopNativeWatchSafely();
  };

  const stopRuntime = async (): Promise<void> => {
    invalidateRuntime();
    await stopNativeWatch();
  };

  const start = async (options: FileWatcherStartOptions = {}): Promise<void> => {
    if (runtimeActive) return;
    currentOptions = normalizeStartOptions(options);
    await startRuntime();
  };

  const restart = async (options: FileWatcherStartOptions = currentOptions): Promise<void> => {
    await stopRuntime();
    if (!deps.shouldRun()) return;
    currentOptions = normalizeStartOptions(options);
    await startRuntime();
  };

  const stop = async (): Promise<void> => {
    await stopRuntime();
  };

  return {
    start,
    restart,
    stop,
    invalidate: invalidateRuntime,
    isActive: () => runtimeActive,
  };
};
