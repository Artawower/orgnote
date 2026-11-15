import { test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';
import type { DiskFile } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useSettingsStore } from './settings';
import { stringifyToml } from 'orgnote-api/utils';
import { withFsRootGate } from 'src/infrastructure/file-systems/fs-root-gate';
import { createDiskFile, createMockFs } from './config-test-fixtures';

vi.mock('src/boot/report', () => ({
  reporter: {
    reportError: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setActivePinia(createPinia());
});

test('stale sync awaiting I/O does not apply stale config or mark later context initialized', async () => {
  let resolveReadFileA: ((content: string) => void) | undefined;
  const readFilePromiseA = new Promise<string>((resolve) => {
    resolveReadFileA = resolve;
  });

  const diskConfigA = clone()(DEFAULT_CONFIG);
  diskConfigA.system.language = 'fr-FR';
  const { fs: fsA } = createMockFs(stringifyToml(diskConfigA));
  fsA.readFile = vi.fn(() => readFilePromiseA as never);

  const diskConfigB = clone()(DEFAULT_CONFIG);
  diskConfigB.system.language = 'de-DE';
  const { fs: fsB } = createMockFs(stringifyToml(diskConfigB));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/vault-a';
  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  const syncAPromise = store.sync();

  await vi.waitFor(() => expect(fsA.readFile).toHaveBeenCalled());

  settingsStore.settings.vault = '/vault-b';
  fsManager.currentFsName = 'fs-b';

  await vi.waitFor(() => expect(store.config.system.language).toBe('de-DE'));

  resolveReadFileA?.(stringifyToml(diskConfigA));
  await syncAPromise;

  expect(store.config.system.language).toBe('de-DE');
});

test('stale sync does not write defaults or mark initialized when storage reconciliation starts', async () => {
  let resolveFileInfo: ((val: DiskFile | undefined) => void) | undefined;
  const fileInfoPromise = new Promise<DiskFile | undefined>((resolve) => {
    resolveFileInfo = resolve;
  });

  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const writeFileSpy = vi.spyOn(fs, 'writeFile');

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  fs.fileInfo = vi.fn(() => fileInfoPromise);

  const store = useConfigStore();
  const syncPromise = store.sync();

  fsManager.isReconciling = true;

  resolveFileInfo?.(undefined);
  await syncPromise;

  expect(writeFileSpy).not.toHaveBeenCalled();
});

test('concurrent sync calls within same context are coalesced into a single flight', async () => {
  let resolveFileInfo: ((val: DiskFile | undefined) => void) | undefined;
  const fileInfoPromise = new Promise<DiskFile | undefined>((resolve) => {
    resolveFileInfo = resolve;
  });

  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.system.language = 'ru-RU';
  const { fs } = createMockFs(stringifyToml(diskConfig));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  const fileInfoSpy = vi.spyOn(fs, 'fileInfo').mockImplementation(() => fileInfoPromise);

  const store = useConfigStore();
  const sync1 = store.sync();
  const sync2 = store.sync();

  resolveFileInfo?.(createDiskFile('/.orgnote/config.toml', 200, 100));
  await Promise.all([sync1, sync2]);

  expect(fileInfoSpy).toHaveBeenCalledTimes(2);
});

test('same-fs root switch waits for in-flight config write to complete via root gate', async () => {
  let resolveWrite: (() => void) | undefined;
  const writePromise = new Promise<void>((resolve) => {
    resolveWrite = resolve;
  });

  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const originalWriteFile = fs.writeFile.bind(fs);
  let isFirstWrite = true;
  fs.writeFile = vi.fn(async (path, content, format) => {
    if (isFirstWrite && path === '/.orgnote/config.toml') {
      isFirstWrite = false;
      await writePromise;
    }
    return originalWriteFile(path, content, format);
  });

  let currentRoot = '/vault-a';
  const initSpy = vi.fn(async () => ({ root: currentRoot }));
  fs.init = initSpy;

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'desktop', initialVault: '/vault-a' });
  useSettingsStore().settings.vault = '/vault-a';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();

  initSpy.mockClear();

  vi.useFakeTimers();
  store.config.system.language = 'de-DE';
  await vi.advanceTimersByTimeAsync(1500);
  expect(fs.writeFile).toHaveBeenCalled();

  currentRoot = '/vault-b';
  useSettingsStore().settings.vault = '/vault-b';
  const switchPromise = fsManager.useFs('mock-fs');

  expect(initSpy).not.toHaveBeenCalled();

  resolveWrite?.();
  await switchPromise;
  expect(initSpy).toHaveBeenCalled();
  vi.useRealTimers();
});

test('stale queued config operation aborted inside gate without performing raw IO', async () => {
  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const fileInfoSpy = vi.spyOn(fs, 'fileInfo');

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/vault-a' });
  useSettingsStore().settings.vault = '/vault-a';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();
  fileInfoSpy.mockClear();

  let releaseGate: (() => void) | undefined;
  const gateHold = new Promise<void>((resolve) => {
    releaseGate = resolve;
  });
  void withFsRootGate(fs, () => gateHold);

  const syncPromise = store.sync();

  fsManager.fsMounted = false;

  releaseGate?.();
  await syncPromise;

  expect(fileInfoSpy).not.toHaveBeenCalled();
});
