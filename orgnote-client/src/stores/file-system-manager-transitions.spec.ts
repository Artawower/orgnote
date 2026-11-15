import { createPinia, setActivePinia } from "pinia";
import { useFileSystemManagerStore } from "./file-system-manager";
import { expect, test, vi, beforeEach } from "vitest";
import type { FileSystemInfo } from "orgnote-api";
import { useSettingsStore } from "./settings";
import type * as StorageBoundStoreModule from "src/infrastructure/stores/storage-bound-store";
import { mockFileSystemInstance } from "./file-system-manager-test-fixtures";

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

test('two concurrent useFs calls with first reset deferred perform no concurrent/duplicate reset and final mount/selection is the latest request', async () => {
  const mountSpyA = vi.fn(async () => true);
  const mountSpyB = vi.fn(async () => true);
  const mountSpyC = vi.fn(async () => true);

  const fsInfoA: FileSystemInfo = {
    name: 'fs-initial',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyA }),
    type: 'desktop',
  };
  const fsInfoB: FileSystemInfo = {
    name: 'fs-second',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyB }),
    type: 'desktop',
  };
  const fsInfoC: FileSystemInfo = {
    name: 'fs-third',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyC }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfoA);
  store.register(fsInfoB);
  store.register(fsInfoC);

  await store.useFs('fs-initial');
  expect(store.currentFsName).toBe('fs-initial');
  expect(mountSpyA).toHaveBeenCalledTimes(1);

  let resolveReset!: () => void;
  const deferredReset = new Promise<void>((resolve) => {
    resolveReset = resolve;
  });
  resetStorageBoundStoresMock.mockImplementationOnce(async () => {
    await deferredReset;
    return undefined;
  });

  const p1 = store.useFs('fs-second');
  const p2 = store.useFs('fs-third');

  expect(resetStorageBoundStoresMock).toHaveBeenCalledTimes(1);

  resolveReset();
  await Promise.all([p1, p2]);

  expect(resetStorageBoundStoresMock).toHaveBeenCalledTimes(1);
  expect(store.currentFsName).toBe('fs-third');
  expect(mountSpyB).not.toHaveBeenCalled();
  expect(mountSpyC).toHaveBeenCalledTimes(1);
  expect(store.currentSession?.fsName).toBe('fs-third');
});

test('reset failure restores confirmed storage as a new active session and reloads safely', async () => {
  const mountSpy = vi.fn(async () => true);
  const fsInfoStable: FileSystemInfo = {
    name: 'fs-stable',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpy }),
    type: 'desktop',
  };
  const fsInfoOther: FileSystemInfo = {
    name: 'fs-other',
    fs: () => mockFileSystemInstance,
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  const settingsStore = useSettingsStore();
  store.register(fsInfoStable);
  store.register(fsInfoOther);

  settingsStore.settings.vault = '/stable-vault';
  await store.useFs('fs-stable');
  const priorSession = store.currentSession;
  expect(priorSession).not.toBeNull();
  expect(priorSession?.fsName).toBe('fs-stable');

  let sessionDuringReset: unknown = 'uninvoked';
  const failure = new Error('reset exploded');
  resetStorageBoundStoresMock.mockImplementationOnce(async () => {
    sessionDuringReset = store.currentSession;
    throw failure;
  });

  await expect(store.useFs('fs-other')).rejects.toThrow('reset exploded');

  expect(sessionDuringReset).toBeNull();
  expect(store.currentFsName).toBe('fs-stable');
  expect(settingsStore.settings.vault).toBe('/stable-vault');
  expect(store.currentSession).not.toBeNull();
  expect(store.currentSession?.fsName).toBe('fs-stable');
  expect(store.currentSession?.root).toBe('/stable-vault');
  expect(store.currentSession?.id).toBeGreaterThan(priorSession?.id ?? 0);

  const reloadResult = await store.runWithMountedFileSystem(store.currentSession!, async () => 'safe-reload');
  expect(reloadResult).toBe('safe-reload');
});

test('superseded target returning to confirmed storage republishes fresh session after reset', async () => {
  const mountSpyA = vi.fn(async () => true);
  const mountSpyB = vi.fn(async () => true);
  const fsInfoA: FileSystemInfo = {
    name: 'fs-confirmed',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyA }),
    type: 'desktop',
  };
  const fsInfoB: FileSystemInfo = {
    name: 'fs-superseded',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyB }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfoA);
  store.register(fsInfoB);

  await store.useFs('fs-confirmed');
  const initialSession = store.currentSession;
  expect(initialSession).not.toBeNull();
  expect(initialSession?.fsName).toBe('fs-confirmed');
  expect(mountSpyA).toHaveBeenCalledTimes(1);

  let resolveReset!: () => void;
  const deferredReset = new Promise<void>((resolve) => {
    resolveReset = resolve;
  });
  resetStorageBoundStoresMock.mockImplementationOnce(async () => {
    await deferredReset;
  });

  const p1 = store.useFs('fs-superseded');
  expect(store.currentSession).toBeNull();

  const p2 = store.useFs('fs-confirmed');
  resolveReset();
  await Promise.all([p1, p2]);

  expect(store.currentFsName).toBe('fs-confirmed');
  expect(mountSpyA).toHaveBeenCalledTimes(1);
  expect(mountSpyB).not.toHaveBeenCalled();
  expect(store.currentSession).not.toBeNull();
  expect(store.currentSession?.fsName).toBe('fs-confirmed');
  expect(store.currentSession?.id).toBeGreaterThan(initialSession?.id ?? 0);
});

test('reconcile failure with pending request rejects all waiters without hanging or applying stale target', async () => {
  let rejectMount!: (error: Error) => void;
  let notifyMountCalled!: () => void;
  const mountCalled = new Promise<void>((resolve) => {
    notifyMountCalled = resolve;
  });
  const deferredMount = new Promise<boolean>((_, reject) => {
    rejectMount = reject;
  });

  const mountSpyFailing = vi.fn(() => {
    notifyMountCalled();
    return deferredMount;
  });
  const mountSpyPending = vi.fn(async () => true);
  const mountSpyConfirmed = vi.fn(async () => true);

  const fsInfoConfirmed: FileSystemInfo = {
    name: 'fs-start',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyConfirmed }),
    type: 'desktop',
  };
  const fsInfoFailing: FileSystemInfo = {
    name: 'fs-fail',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyFailing }),
    type: 'desktop',
  };
  const fsInfoPending: FileSystemInfo = {
    name: 'fs-pending',
    fs: () => ({ ...mockFileSystemInstance, mount: mountSpyPending }),
    type: 'desktop',
  };

  const store = useFileSystemManagerStore();
  store.register(fsInfoConfirmed);
  store.register(fsInfoFailing);
  store.register(fsInfoPending);

  await store.useFs('fs-start');

  const p1 = store.useFs('fs-fail');
  await mountCalled;

  const p2 = store.useFs('fs-pending');

  rejectMount(new Error('reconcile exploded'));
  const results = await Promise.allSettled([p1, p2]);

  expect(results[0].status).toBe('rejected');
  expect(results[1].status).toBe('rejected');
  expect(mountSpyPending).not.toHaveBeenCalled();
  expect(store.isReconciling).toBe(false);

  await store.useFs('fs-start');
  expect(store.currentFsName).toBe('fs-start');
  expect(mountSpyPending).not.toHaveBeenCalled();
});



