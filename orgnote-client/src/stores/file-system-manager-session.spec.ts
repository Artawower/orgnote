import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystem, FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

test('currentSession is null when unmounted or reconciling, and increments monotonically across remounts', async () => {
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
    init: vi.fn(async () => ({ root: '/vault-1' })),
    mount: vi.fn(async () => true),
  };

  const fsInfo: FileSystemInfo = {
    name: 'session-fs',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  expect(store.currentSession).toBeNull();

  await store.useFs('session-fs');

  const session1 = store.currentSession;
  expect(session1).not.toBeNull();
  expect(session1?.id).toBeGreaterThan(0);
  expect(session1?.fsName).toBe('session-fs');
  expect(session1?.root).toBe('/vault-1');
  expect(session1?.storageKey).toBe('session-fs:/vault-1');
  expect(store.currentSession).toBe(session1);

  store.isReconciling = true;
  expect(store.currentSession).toBeNull();

  store.isReconciling = false;
  const session2 = store.currentSession;
  expect(session2).not.toBeNull();
  expect(session2?.id).toBeGreaterThan(session1?.id ?? 0);

  store.fsMounted = false;
  expect(store.currentSession).toBeNull();

  await store.useFs('session-fs');
  const session3 = store.currentSession;
  expect(session3).not.toBeNull();
  expect(session3?.id).toBeGreaterThan(session2?.id ?? 0);
});

test('currentSession invalidates eagerly on unmount without intermediate read (ABA regression)', async () => {
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
    name: 'aba-fs',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);
  settingsStore.settings.vault = '/vault-aba';
  await store.useFs('aba-fs');

  const sessionA = store.currentSession;
  expect(sessionA).not.toBeNull();

  store.fsMounted = false;
  await store.useFs('aba-fs');

  const sessionB = store.currentSession;
  expect(sessionB).not.toBeNull();
  expect(sessionB).not.toBe(sessionA);
  expect(sessionB?.id).toBeGreaterThan(sessionA?.id ?? 0);
});

test('currentSession is revoked when desired root diverges before remount completes', async () => {
  let finishRemount: (() => void) | undefined;
  const remountGate = new Promise<void>((resolve) => {
    finishRemount = resolve;
  });

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
    init: vi.fn(async (params) => ({ root: params?.root ?? '/vault-1' })),
    mount: vi.fn(async (params) => {
      if (params?.root === '/vault-2') {
        await remountGate;
      }
      return true;
    }),
  };

  const fsInfo: FileSystemInfo = {
    name: 'diverged-fs',
    fs: () => rawFs,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);
  settingsStore.settings.vault = '/vault-1';
  await store.useFs('diverged-fs');

  const session1 = store.currentSession;
  expect(session1).not.toBeNull();
  expect(session1?.root).toBe('/vault-1');

  settingsStore.settings.vault = '/vault-2';
  expect(store.currentSession).toBeNull();

  const remountPromise = store.useFs('diverged-fs');
  finishRemount?.();
  await remountPromise;

  const session2 = store.currentSession;
  expect(session2).not.toBeNull();
  expect(session2?.root).toBe('/vault-2');
  expect(session2?.id).toBeGreaterThan(session1?.id ?? 0);
});


