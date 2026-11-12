import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { useFileSystemRootConfigurator } from "src/composables/file-system-root-configurator";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";
import type * as StorageBoundStoreModule from "src/infrastructure/stores/storage-bound-store";
import { mockFileSystemInstance, mockFileSystemInfo } from "./file-system-manager-test-fixtures";

const resetStorageBoundStoresMock = vi.fn(async () => undefined);
vi.mock("src/infrastructure/stores/storage-bound-store", async (importOriginal) => {
  const actual = await importOriginal<typeof StorageBoundStoreModule>();
  return {
    ...actual,
    resetStorageBoundStores: () => resetStorageBoundStoresMock(),
  };
});

const reportErrorMock = vi.fn();
vi.mock("src/boot/report", () => ({
  reporter: {
    reportError: (err: unknown) => reportErrorMock(err),
  },
}));

beforeEach(() => {
  const pinia = createPinia();
  setActivePinia(pinia);
  resetStorageBoundStoresMock.mockClear();
  reportErrorMock.mockClear();
});

test('initial mount does not invoke resetStorageBoundStores when no prior confirmed storage exists', async () => {
  const store = useFileSystemManagerStore();
  store.register(mockFileSystemInfo);

  await store.useFs('mockFs');

  expect(store.currentFsName).toBe('mockFs');
  expect(resetStorageBoundStoresMock).not.toHaveBeenCalled();
});

test('switching filesystem invokes resetStorageBoundStores once', async () => {
  const store = useFileSystemManagerStore();
  const fsInfoA: FileSystemInfo = {
    name: 'fs-switch-a',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };
  const fsInfoB: FileSystemInfo = {
    name: 'fs-switch-b',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };
  store.register(fsInfoA);
  store.register(fsInfoB);

  await store.useFs('fs-switch-a');
  expect(resetStorageBoundStoresMock).not.toHaveBeenCalled();

  await store.useFs('fs-switch-b');
  expect(resetStorageBoundStoresMock).toHaveBeenCalledTimes(1);
});

test('confirmed-root change invokes resetStorageBoundStores once via reconfigureCurrentFs and useFs', async () => {
  const mountSpy = vi.fn(async () => true);
  const pickFolderSpy = vi.fn(async () => '/new-picked-vault');

  const fsInfo: FileSystemInfo = {
    name: 'pickable-reset-fs',
    fs: () => ({
      ...mockFileSystemInstance,
      mount: mountSpy,
      pickFolder: pickFolderSpy,
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);

  settingsStore.settings.vault = '/initial-vault';
  await store.useFs('pickable-reset-fs');
  expect(resetStorageBoundStoresMock).not.toHaveBeenCalled();

  await useFileSystemRootConfigurator().reconfigureCurrentFs();
  expect(resetStorageBoundStoresMock).toHaveBeenCalledTimes(1);
  expect(settingsStore.settings.vault).toBe('/new-picked-vault');

  await store.useFs('pickable-reset-fs');
  expect(resetStorageBoundStoresMock).toHaveBeenCalledTimes(1);
});

test('switching filesystems while previous is unmounted clears vault without invoking storage reset', async () => {
  const fsInfoA: FileSystemInfo = {
    name: 'unmounted-fs-a',
    fs: () => ({
      ...mockFileSystemInstance,
      mount: vi.fn(async () => false),
    }),
    type: 'desktop',
  };
  const fsInfoB: FileSystemInfo = {
    name: 'unmounted-fs-b',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfoA);
  store.register(fsInfoB);

  settingsStore.settings.vault = '/vault-on-a';
  await store.useFs('unmounted-fs-a');
  expect(store.fsMounted).toBe(false);
  expect(resetStorageBoundStoresMock).not.toHaveBeenCalled();

  settingsStore.settings.vault = '/vault-on-a';
  await store.useFs('unmounted-fs-b');

  expect(settingsStore.settings.vault).toBeUndefined();
  expect(resetStorageBoundStoresMock).not.toHaveBeenCalled();
});

test('aborts transition and reports error when storage reset fails', async () => {
  const store = useFileSystemManagerStore();
  const fsInfoA: FileSystemInfo = {
    name: 'fs-fail-a',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };
  const fsInfoB: FileSystemInfo = {
    name: 'fs-fail-b',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };
  store.register(fsInfoA);
  store.register(fsInfoB);

  await store.useFs('fs-fail-a');
  expect(store.currentFsName).toBe('fs-fail-a');

  const failure = new Error('storage reset exploded');
  resetStorageBoundStoresMock.mockRejectedValueOnce(failure);

  await expect(store.useFs('fs-fail-b')).rejects.toThrow('storage reset exploded');
  expect(reportErrorMock).toHaveBeenCalledWith(failure);
  expect(store.currentFsName).toBe('fs-fail-a');
});

test('failed reset during confirmed same-filesystem root switch preserves prior root and active session', async () => {
  const mountSpy = vi.fn(async () => true);
  const pickFolderSpy = vi.fn(async () => '/new-vault');

  const fsInfo: FileSystemInfo = {
    name: 'root-switch-fail-fs',
    fs: () => ({
      ...mockFileSystemInstance,
      mount: mountSpy,
      pickFolder: pickFolderSpy,
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);

  settingsStore.settings.vault = '/prior-vault';
  await store.useFs('root-switch-fail-fs');
  mountSpy.mockClear();

  const priorSession = store.currentSession;
  expect(priorSession).not.toBeNull();
  expect(priorSession?.root).toBe('/prior-vault');

  const failure = new Error('root reset exploded');
  resetStorageBoundStoresMock.mockRejectedValueOnce(failure);

  await expect(useFileSystemRootConfigurator().reconfigureCurrentFs()).rejects.toThrow('root reset exploded');

  expect(settingsStore.settings.vault).toBe('/prior-vault');
  expect(store.currentSession).not.toBeNull();
  expect(store.currentSession?.id).toBeGreaterThan(priorSession?.id ?? 0);
  expect(store.currentSession?.root).toBe('/prior-vault');
  expect(mountSpy).not.toHaveBeenCalled();
});

test('failed reset restores prior root and active session when vault was modified before useFs', async () => {
  const mountSpy = vi.fn(async () => true);

  const fsInfo: FileSystemInfo = {
    name: 'direct-vault-fail-fs',
    fs: () => ({
      ...mockFileSystemInstance,
      mount: mountSpy,
    }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfo);

  settingsStore.settings.vault = '/prior-vault';
  await store.useFs('direct-vault-fail-fs');
  mountSpy.mockClear();

  const failure = new Error('direct vault reset exploded');
  resetStorageBoundStoresMock.mockRejectedValueOnce(failure);

  settingsStore.settings.vault = '/diverged-vault';
  await expect(store.useFs('direct-vault-fail-fs')).rejects.toThrow('direct vault reset exploded');

  expect(settingsStore.settings.vault).toBe('/prior-vault');
  expect(store.currentSession).not.toBeNull();
  expect(store.currentSession?.root).toBe('/prior-vault');
  expect(mountSpy).not.toHaveBeenCalled();
});

