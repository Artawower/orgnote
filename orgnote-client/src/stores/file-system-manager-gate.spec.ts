import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystem, FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";
import { withFsRootGate } from "src/infrastructure/file-systems/fs-root-gate";
import { createDeferred, createReadFile } from "./file-system-manager-test-fixtures";

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

test('useFs ignores stale init result after filesystem switch', async () => {
  const initGateA = createDeferred<{ root: string }>();
  const mountSpyA = vi.fn(async () => true);
  const mountSpyB = vi.fn(async () => true);

  const fsInfoA: FileSystemInfo = {
    name: 'stale-fs-a',
    fs: () => ({
      readFile: createReadFile(),
      writeFile: vi.fn(async () => undefined),
      readDir: vi.fn(async () => []),
      fileInfo: vi.fn(async () => undefined),
      rename: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
      rmdir: vi.fn(async () => undefined),
      mkdir: vi.fn(async () => undefined),
      isDirExist: vi.fn(async () => true),
      isFileExist: vi.fn(async () => true),
      utimeSync: vi.fn(async () => undefined),
      init: vi.fn(async () => initGateA.promise),
      mount: mountSpyA,
    }),
    type: 'web',
  };

  const fsInfoB: FileSystemInfo = {
    name: 'stale-fs-b',
    fs: () => ({
      readFile: createReadFile(),
      writeFile: vi.fn(async () => undefined),
      readDir: vi.fn(async () => []),
      fileInfo: vi.fn(async () => undefined),
      rename: vi.fn(async () => undefined),
      deleteFile: vi.fn(async () => undefined),
      rmdir: vi.fn(async () => undefined),
      mkdir: vi.fn(async () => undefined),
      isDirExist: vi.fn(async () => true),
      isFileExist: vi.fn(async () => true),
      utimeSync: vi.fn(async () => undefined),
      init: vi.fn(async () => ({ root: '/b' })),
      mount: mountSpyB,
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfoA);
  store.register(fsInfoB);

  const pendingA = store.useFs('stale-fs-a');
  await Promise.resolve();
  const pendingB = store.useFs('stale-fs-b');

  initGateA.resolve({ root: '/a' });
  await Promise.all([pendingA, pendingB]);

  expect(settingsStore.settings.vault).toBe('/b');
  expect(mountSpyA).not.toHaveBeenCalled();
  expect(mountSpyB).toHaveBeenCalledWith({ root: '/b' });
});


test('queued init rechecks desired snapshot inside gate and skips stale init', async () => {
  const initSpy = vi.fn(async () => ({ root: '/vault-1' }));
  const rawFs = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readDir: vi.fn(),
    fileInfo: vi.fn(),
    rename: vi.fn(),
    deleteFile: vi.fn(),
    rmdir: vi.fn(),
    mkdir: vi.fn(),
    isDirExist: vi.fn(),
    isFileExist: vi.fn(),
    utimeSync: vi.fn(),
    init: initSpy,
    mount: vi.fn(async () => true),
  };

  const fsInfo: FileSystemInfo = {
    name: 'gate-fs',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);
  settingsStore.settings.vault = '/vault-1';

  let releaseGate: (() => void) | undefined;
  const gatePromise = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  void withFsRootGate(rawFs, () => gatePromise);

  const useFsPromise = store.useFs('gate-fs');

  store.currentFsName = '';

  releaseGate?.();
  await useFsPromise;

  expect(initSpy).not.toHaveBeenCalled();
});


test('runWithMountedFileSystem validates session before gate and inside gate', async () => {
  const rawFs: FileSystem = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    rename: vi.fn(),
    readDir: vi.fn(),
    fileInfo: vi.fn(),
    rmdir: vi.fn(),
    mkdir: vi.fn(),
    isDirExist: vi.fn(),
    isFileExist: vi.fn(),
    utimeSync: vi.fn(),
    init: vi.fn(async () => undefined),
    mount: vi.fn(async () => true),
  };

  const fsInfo: FileSystemInfo = {
    name: 'session-fs-2',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);
  settingsStore.settings.vault = '/vault';
  await store.useFs('session-fs-2');

  const activeSession = store.currentSession;
  expect(activeSession).not.toBeNull();

  const staleSession = { ...activeSession!, id: -999 };
  const staleOp = vi.fn(async () => 'ran');
  const staleRes = await store.runWithMountedFileSystem(staleSession, staleOp);
  expect(staleRes).toBeUndefined();
  expect(staleOp).not.toHaveBeenCalled();

  let releaseGate: (() => void) | undefined;
  const gateHeld = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  void withFsRootGate(rawFs, () => gateHeld);

  const queuedOp = vi.fn(async () => 'queued-ran');
  const queuedRun = store.runWithMountedFileSystem(activeSession!, queuedOp);

  store.fsMounted = false;
  releaseGate?.();
  const queuedRes = await queuedRun;

  expect(queuedRes).toBeUndefined();
  expect(queuedOp).not.toHaveBeenCalled();
});

test('runWithMountedFileSystem executes operation under gate serialization', async () => {
  const rawFs: FileSystem = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    rename: vi.fn(),
    readDir: vi.fn(),
    fileInfo: vi.fn(),
    rmdir: vi.fn(),
    mkdir: vi.fn(),
    isDirExist: vi.fn(),
    isFileExist: vi.fn(),
    utimeSync: vi.fn(),
    init: vi.fn(async () => undefined),
    mount: vi.fn(async () => true),
  };

  const fsInfo: FileSystemInfo = {
    name: 'session-fs-3',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);
  settingsStore.settings.vault = '/vault';
  await store.useFs('session-fs-3');

  const activeSession = store.currentSession;
  expect(activeSession).not.toBeNull();

  const order: string[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const p1 = store.runWithMountedFileSystem(activeSession!, async () => {
    order.push('p1:start');
    await firstGate;
    order.push('p1:end');
    return 1;
  });

  const p2 = store.runWithMountedFileSystem(activeSession!, async () => {
    order.push('p2:start');
    order.push('p2:end');
    return 2;
  });

  releaseFirst?.();
  const [r1, r2] = await Promise.all([p1, p2]);

  expect(r1).toBe(1);
  expect(r2).toBe(2);
  expect(order).toEqual(['p1:start', 'p1:end', 'p2:start', 'p2:end']);
});

