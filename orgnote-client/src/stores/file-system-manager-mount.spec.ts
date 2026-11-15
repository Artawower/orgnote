import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystem, FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";
import { toRaw } from "vue";
import { createDeferred, createReadFile, createMinimalFs } from "./file-system-manager-test-fixtures";

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

test('useFs updates desired fs before runtime mount resolves', async () => {
  const initGate = createDeferred<{ root: string }>();
  const created: FileSystem[] = [];

  const fsInfo: FileSystemInfo = {
    name: 'gated-fs',
    fs: () => {
      const fs = createMinimalFs(initGate.promise);
      created.push(fs);
      return fs;
    },
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '';

  const pending = store.useFs('gated-fs');

  await Promise.resolve();
  expect(store.currentFsName).toBe('gated-fs');
  expect(store.fsMounted).toBe(false);

  initGate.resolve({ root: '/picked' });
  await pending;

  expect(store.currentFsName).toBe('gated-fs');
  expect(store.fsMounted).toBe(true);
});

test('currentFs uses the same initialized FS instance', async () => {
  const initGate = createDeferred<{ root: string }>();
  const created: FileSystem[] = [];

  const fsInfo: FileSystemInfo = {
    name: 'unstable-fs-factory',
    fs: () => {
      const fs = createMinimalFs(initGate.promise);
      created.push(fs);
      return fs;
    },
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  initGate.resolve({ root: '/picked' });
  await store.useFs('unstable-fs-factory');

  expect(created.length).toBe(1);
  expect(toRaw(store.currentFs)).toBe(created[0]);
});

test('useFs does not reinitialize when selecting the same filesystem', async () => {
  const initSpy = vi.fn(async () => ({ root: '/' }));

  const fsInfo: FileSystemInfo = {
    name: 'tracked-fs',
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
      init: initSpy,
      mount: vi.fn(async () => true),
    }),
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  await store.useFs('tracked-fs');
  expect(initSpy).toHaveBeenCalledTimes(1);

  await store.useFs('tracked-fs');
  await store.useFs('tracked-fs');
  await store.useFs('tracked-fs');

  expect(initSpy).toHaveBeenCalledTimes(1);
});

test('useFs remounts active filesystem when desired vault changed', async () => {
  const initSpy = vi.fn(async () => ({ root: '/vault' }));

  const fsInfo: FileSystemInfo = {
    name: 'already-active-fs',
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
      init: initSpy,
      mount: vi.fn(async () => true),
    }),
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/initial';

  await store.useFs('already-active-fs');

  expect(store.currentFsName).toBe('already-active-fs');
  expect(settingsStore.settings.vault).toBe('/vault');
  expect(initSpy).toHaveBeenCalledTimes(1);

  settingsStore.settings.vault = '/should-remount';

  await store.useFs('already-active-fs');

  expect(initSpy).toHaveBeenCalledTimes(2);
  expect(settingsStore.settings.vault).toBe('/vault');
});

test('useFs allows switching between different filesystems', async () => {
  const initSpyA = vi.fn(async () => ({ root: '/a' }));
  const initSpyB = vi.fn(async () => ({ root: '/b' }));

  const fsInfoA: FileSystemInfo = {
    name: 'fs-a',
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
      init: initSpyA,
      mount: vi.fn(async () => true),
    }),
    type: 'web',
  };

  const fsInfoB: FileSystemInfo = {
    name: 'fs-b',
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
      init: initSpyB,
      mount: vi.fn(async () => true),
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfoA);
  store.register(fsInfoB);

  await store.useFs('fs-a');
  expect(store.currentFsName).toBe('fs-a');
  expect(initSpyA).toHaveBeenCalledTimes(1);
  expect(initSpyB).toHaveBeenCalledTimes(0);

  await store.useFs('fs-b');
  expect(store.currentFsName).toBe('fs-b');
  expect(initSpyA).toHaveBeenCalledTimes(1);
  expect(initSpyB).toHaveBeenCalledTimes(1);

  await store.useFs('fs-a');
  expect(store.currentFsName).toBe('fs-a');
  expect(initSpyA).toHaveBeenCalledTimes(2);
  expect(initSpyB).toHaveBeenCalledTimes(1);
});


test('useFs maintains currentFsName when called with same name repeatedly', async () => {
  const initSpy = vi.fn(async () => ({ root: '/' }));

  const fsInfo: FileSystemInfo = {
    name: 'stable-fs',
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
      init: initSpy,
      mount: vi.fn(async () => true),
    }),
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  await store.useFs('stable-fs');

  const nameAfterFirstCall = store.currentFsName;

  await store.useFs('stable-fs');
  await store.useFs('stable-fs');

  expect(store.currentFsName).toBe(nameAfterFirstCall);
  expect(store.currentFsName).toBe('stable-fs');
});

