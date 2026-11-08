import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { useFileSystemRootConfigurator } from "src/composables/file-system-root-configurator";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";
import { createDeferred, createReadFile } from "./file-system-manager-test-fixtures";

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
});

test('reconfigureCurrentFs stores picked root and remounts current filesystem', async () => {
  const mountSpy = vi.fn(async () => true);
  const pickFolderSpy = vi.fn(async () => '/picked-root');

  const fsInfo: FileSystemInfo = {
    name: 'pickable-fs',
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
      init: vi.fn(async (params) => params),
      mount: mountSpy,
      pickFolder: pickFolderSpy,
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);
  await store.useFs('pickable-fs');

  await useFileSystemRootConfigurator().reconfigureCurrentFs();

  const settingsStore = useSettingsStore();
  expect(pickFolderSpy).toHaveBeenCalledTimes(1);
  expect(settingsStore.settings.vault).toBe('/picked-root');
  expect(mountSpy).toHaveBeenLastCalledWith({ root: '/picked-root' });
});


test('reconfigureCurrentFs ignores stale mount result after root change', async () => {
  const firstMount = createDeferred<boolean>();
  const secondMount = createDeferred<boolean>();
  const mountSpy = vi
    .fn<() => Promise<boolean>>()
    .mockImplementationOnce(async () => firstMount.promise)
    .mockImplementationOnce(async () => secondMount.promise);

  const fsInfo: FileSystemInfo = {
    name: 'slow-mount-fs',
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
      init: vi.fn(async (params) => params),
      mount: mountSpy,
      pickFolder: vi.fn(async () => '/second-root'),
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfo);

  const pendingMount = store.useFs('slow-mount-fs');
  await Promise.resolve();
  const pendingReconfigure = useFileSystemRootConfigurator().reconfigureCurrentFs();

  firstMount.resolve(true);
  await Promise.resolve();
  await Promise.resolve();
  expect(store.fsMounted).toBe(false);

  secondMount.resolve(true);
  await Promise.all([pendingMount, pendingReconfigure]);

  expect(store.fsMounted).toBe(true);
  expect(mountSpy).toHaveBeenLastCalledWith({ root: '/second-root' });
});

test('reconfigureCurrentFs accepts empty root returned by picker', async () => {
  const pickFolderSpy = vi.fn(async () => '');
  const mountSpy = vi.fn(async () => true);

  const fsInfo: FileSystemInfo = {
    name: 'empty-picker-root-fs',
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
      init: vi.fn(async (params) => params),
      mount: mountSpy,
      pickFolder: pickFolderSpy,
    }),
    type: 'web',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);

  await store.useFs('empty-picker-root-fs');
  settingsStore.settings.vault = '/previous-root';

  await useFileSystemRootConfigurator().reconfigureCurrentFs();

  expect(settingsStore.settings.vault).toBe('');
  expect(pickFolderSpy).toHaveBeenCalledTimes(1);
  expect(mountSpy).toHaveBeenLastCalledWith({ root: '' });
});

test('reconfigureCurrentFs applies empty root returned by init', async () => {
  let initRoot = '/initial-root';
  const mountSpy = vi.fn(async () => true);

  const fsInfo: FileSystemInfo = {
    name: 'empty-root-fs',
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
      init: vi.fn(async () => ({ root: initRoot })),
      mount: mountSpy,
      pickFolder: vi.fn(async () => '/picked-root'),
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);

  await store.useFs('empty-root-fs');
  expect(settingsStore.settings.vault).toBe('/initial-root');

  initRoot = '';
  await useFileSystemRootConfigurator().reconfigureCurrentFs();

  expect(settingsStore.settings.vault).toBe('');
  expect(mountSpy).toHaveBeenLastCalledWith({ root: '' });
});

