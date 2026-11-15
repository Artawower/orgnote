import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref, shallowRef } from 'vue';
import { useFileWatcherStore } from './file-watcher';
import { withFsRootGate } from 'src/infrastructure/file-systems/fs-root-gate';

type TestWatcherHandle = {
  stop: () => Promise<void> | void;
};

type TestNativeChange = {
  path: string;
  type: 'create' | 'modify' | 'delete' | 'rename';
  mtime?: number;
  previousPath?: string;
};

type TestNativeWatch = (listener: (change: TestNativeChange) => void) => Promise<TestWatcherHandle>;

type TestSession = {
  id: number;
  fs: unknown;
  fsName: string;
  storageKey: string;
};

const sessionOverride = shallowRef<TestSession | null | undefined>(undefined);
const fsMountedRef = ref(true);

const mocks = vi.hoisted(() => ({
  reportWarning: vi.fn(),
  reportResult: vi.fn(),
  reportError: vi.fn(),
  fsManager: {
    currentFs: { watch: undefined as TestNativeWatch | undefined },
    currentFsInfo: { name: 'mock-fs' },
    get fsMounted() {
      return fsMountedRef.value;
    },
    set fsMounted(value: boolean) {
      fsMountedRef.value = value;
    },
    get currentSession() {
      if (sessionOverride.value !== undefined) {
        return sessionOverride.value;
      }
      if (!fsMountedRef.value) return null;
      return {
        id: 1,
        fs: mocks.fsManager.currentFs,
        fsName: 'mock-fs',
        storageKey: 'mock-fs:',
      };
    },
    runWithMountedFileSystem: async (session: { id: number; fs: unknown }, op: () => Promise<unknown>) => {
      if (!mocks.fsManager.fsMounted || mocks.fsManager.currentSession?.id !== session.id) return undefined;
      return withFsRootGate(session.fs as never, async () => {
        if (!mocks.fsManager.fsMounted || mocks.fsManager.currentSession?.id !== session.id) return undefined;
        return op();
      });
    },
  },
}));

vi.mock('src/stores/file-system', () => ({
  useFileSystemStore: vi.fn(() => ({
    readDir: vi.fn(async () => []),
  })),
}));

vi.mock('src/stores/file-system-manager', () => ({
  useFileSystemManagerStore: vi.fn(() => mocks.fsManager),
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportWarning: mocks.reportWarning,
    reportResult: mocks.reportResult,
    reportError: mocks.reportError,
  },
}));

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.reportWarning.mockReset();
  mocks.reportResult.mockReset();
  mocks.reportError.mockReset();
  sessionOverride.value = undefined;
  fsMountedRef.value = true;
  mocks.fsManager.currentFs = { watch: undefined };
  mocks.fsManager.currentFsInfo = { name: 'mock-fs' };
  mocks.fsManager.fsMounted = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

test('stops native watch handle that resolves after restart', async () => {
  const oldHandle = { stop: vi.fn(async () => undefined) };
  const newHandle = { stop: vi.fn(async () => undefined) };
  const oldWatch = createDeferred<TestWatcherHandle>();
  const watch = vi
    .fn<TestNativeWatch>()
    .mockImplementationOnce(async () => oldWatch.promise)
    .mockImplementationOnce(async () => newHandle);
  mocks.fsManager.currentFs = { watch };

  const store = useFileWatcherStore();
  const pendingStart = store.start();
  await Promise.resolve();

  const pendingRestart = store.restart();
  oldWatch.resolve(oldHandle);
  await Promise.all([pendingStart, pendingRestart]);

  expect(oldHandle.stop).toHaveBeenCalledTimes(1);
  expect(newHandle.stop).not.toHaveBeenCalled();

  await store.stop();
});

test('native watch start failure does not block retry', async () => {
  const handle = { stop: vi.fn(async () => undefined) };
  const watch = vi
    .fn<TestNativeWatch>()
    .mockRejectedValueOnce(new Error('watch failed'))
    .mockResolvedValueOnce(handle);
  mocks.fsManager.currentFs = { watch };

  const store = useFileWatcherStore();
  await expect(store.start()).rejects.toThrow('watch failed');
  await store.start();

  expect(watch).toHaveBeenCalledTimes(2);

  await store.stop();
});

test('native watch suppresses recent local duplicate', async () => {
  const handle = { stop: vi.fn(async () => undefined) };
  let nativeListener: ((change: TestNativeChange) => void) | undefined;
  const watch = vi.fn<TestNativeWatch>().mockImplementation(async (listener) => {
    nativeListener = listener;
    return handle;
  });
  mocks.fsManager.currentFs = { watch };

  const change = { path: '/note.org', type: 'modify' as const, mtime: 10 };
  const listener = vi.fn();
  const store = useFileWatcherStore();
  store.watch('/', listener, { recursive: true });

  await store.start();
  await store.emitChange(change);
  nativeListener?.(change);

  expect(listener).toHaveBeenCalledTimes(1);

  await store.stop();
});

test('queued native watch startup rechecks generation inside gate and aborts without calling watch', async () => {
  const watchSpy = vi.fn(async () => ({ stop: vi.fn() }));
  const rawFs = {
    watch: watchSpy,
  };
  mocks.fsManager.currentFs = rawFs as never;

  let releaseGate: (() => void) | undefined;
  const gatePromise = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  void withFsRootGate(rawFs as never, () => gatePromise);

  const store = useFileWatcherStore();
  const startPromise = store.start();

  await store.stop();

  releaseGate?.();
  await startPromise;

  expect(watchSpy).not.toHaveBeenCalled();
});

test('in-flight native watch startup holds gate and prevents concurrent gated operations', async () => {
  let resolveWatch: (() => void) | undefined;
  const watchInProgress = new Promise<void>((resolve) => {
    resolveWatch = resolve;
  });
  const handle = { stop: vi.fn(async () => undefined) };
  const rawFs = {
    watch: vi.fn(async () => {
      await watchInProgress;
      return handle;
    }),
  };
  mocks.fsManager.currentFs = rawFs as never;

  const store = useFileWatcherStore();
  const startPromise = store.start();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  expect(rawFs.watch).toHaveBeenCalled();

  let gatedOpExecuted = false;
  const gatedOpPromise = withFsRootGate(rawFs as never, async () => {
    gatedOpExecuted = true;
  });

  await Promise.resolve();
  expect(gatedOpExecuted).toBe(false);

  resolveWatch?.();
  await startPromise;
  await gatedOpPromise;

  expect(gatedOpExecuted).toBe(true);
  await store.stop();
});

test('same-tick session revoke/restore stops one native handle exactly once', async () => {
  const oldHandle = { stop: vi.fn(async () => undefined) };
  const newHandle = { stop: vi.fn(async () => undefined) };
  const watch = vi
    .fn<TestNativeWatch>()
    .mockResolvedValueOnce(oldHandle)
    .mockResolvedValueOnce(newHandle);
  mocks.fsManager.currentFs = { watch };

  const store = useFileWatcherStore();
  await store.start();

  expect(watch).toHaveBeenCalledTimes(1);

  const newSession: TestSession = {
    id: 2,
    fs: mocks.fsManager.currentFs,
    fsName: 'mock-fs',
    storageKey: 'mock-fs-2:',
  };

  sessionOverride.value = null;
  sessionOverride.value = newSession;

  await vi.waitFor(() => expect(watch).toHaveBeenCalledTimes(2));

  expect(oldHandle.stop).toHaveBeenCalledTimes(1);

  await store.stop();
  expect(newHandle.stop).toHaveBeenCalledTimes(1);
  expect(oldHandle.stop).toHaveBeenCalledTimes(1);
});

test('rejected stop from fire-and-forget invalidation is reported/handled without duplicate stop', async () => {
  const handle = {
    stop: vi.fn(async () => {
      throw new Error('native stop failed');
    }),
  };
  const watch = vi.fn<TestNativeWatch>().mockResolvedValue(handle);
  mocks.fsManager.currentFs = { watch };

  const store = useFileWatcherStore();
  await store.start();

  expect(watch).toHaveBeenCalledTimes(1);

  sessionOverride.value = null;

  await vi.waitFor(() =>
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('native') }),
    ),
  );

  expect(handle.stop).toHaveBeenCalledTimes(1);

  await store.stop();
  expect(handle.stop).toHaveBeenCalledTimes(1);
});
