import { test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';
import type { FileSystem, FileSystemInfo } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useSettingsStore } from './settings';
import { stringifyToml } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { logger } from 'src/boot/logger';
import { createMockFs } from './config-test-fixtures';

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

test('should initialize with default config', () => {
  const store = useConfigStore();

  expect(store.config).toEqual(clone()(DEFAULT_CONFIG));
  expect(store.configErrors).toEqual([]);
  expect(store.sync).toBeDefined();
});

test('should have config as reactive object', () => {
  const store = useConfigStore();

  expect(store.config).toBeDefined();
  expect(store.config.system).toBeDefined();
  expect(store.config.ui).toBeDefined();
});

test('should have empty config errors initially', () => {
  const store = useConfigStore();

  expect(store.configErrors).toEqual([]);
  expect(Array.isArray(store.configErrors)).toBe(true);
});

test('should have sync method', () => {
  const store = useConfigStore();

  expect(typeof store.sync).toBe('function');
});

test('config should be equal to DEFAULT_CONFIG structure', () => {
  const store = useConfigStore();
  const defaultConfig = clone()(DEFAULT_CONFIG);

  expect(store.config.system).toEqual(defaultConfig.system);
  expect(store.config.ui).toEqual(defaultConfig.ui);
});

test('should create independent store instances', () => {
  const store1 = useConfigStore();
  const store2 = useConfigStore();

  expect(store1).toBe(store2);
});

test('config should be mutable', () => {
  const store = useConfigStore();

  store.config.system.language = 'ru-RU';

  expect(store.config.system.language).toBe('ru-RU');
});

test('configErrors should be reactive array', () => {
  const store = useConfigStore();

  store.configErrors.push('Test error');

  expect(store.configErrors).toContain('Test error');
  expect(store.configErrors.length).toBe(1);
});

test('sync loads config.toml into store', async () => {
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.system.language = 'ru-RU';

  const { fs } = createMockFs(stringifyToml(diskConfig));

  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => fs,
    type: 'web',
    initialVault: '/',
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/';

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();

  expect(store.config.system.language).toBe('ru-RU');
});

test('sync is a no-op when no filesystem selected', async () => {
  const store = useConfigStore();

  await expect(store.sync()).resolves.toBeUndefined();
  expect(reporter.reportError).not.toHaveBeenCalled();
});

test('sync with pickFolder fs but empty vault skips disk sync', async () => {
  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const fileInfoSpy = vi.spyOn(fs, 'fileInfo');
  const writeFileSpy = vi.spyOn(fs, 'writeFile');

  const fsInfo: FileSystemInfo = {
    name: 'mock-fs',
    fs: () => ({
      ...fs,
      pickFolder: vi.fn(async () => '/picked'),
    }),
    type: 'web',
  };

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '';

  const fsManager = useFileSystemManagerStore();
  fsManager.register(fsInfo);
  fsManager.currentFsName = 'mock-fs';

  const store = useConfigStore();
  await store.sync();

  expect(fileInfoSpy).not.toHaveBeenCalled();
  expect(writeFileSpy).not.toHaveBeenCalled();
  expect(reporter.reportError).not.toHaveBeenCalled();
});

test('sync does not overwrite config when metadata lookup fails', async () => {
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.synchronization.type = 'api';
  const diskContent = stringifyToml(diskConfig);
  const { fs, files } = createMockFs(diskContent);
  const writeFileSpy = vi.spyOn(fs, 'writeFile');
  fs.fileInfo = vi.fn(async () => {
    throw new Error('Storage is temporarily unavailable');
  });

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  await useConfigStore().sync();

  expect(writeFileSpy).not.toHaveBeenCalled();
  expect(files.get('/.orgnote/config.toml')?.content).toBe(diskContent);
  expect(reporter.reportError).toHaveBeenCalled();
});

test('sync retries after a transient metadata failure', async () => {
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.synchronization.type = 'api';
  const { fs } = createMockFs(stringifyToml(diskConfig));
  const readFileInfo = fs.fileInfo.bind(fs);
  let isMetadataUnavailable = true;
  fs.fileInfo = vi.fn(async (path) => {
    if (isMetadataUnavailable) throw new Error('Storage is temporarily unavailable');
    return readFileInfo(path);
  });

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');
  const store = useConfigStore();

  await store.sync();
  isMetadataUnavailable = false;
  await store.sync();

  expect(store.config.synchronization.type).toBe('api');
});

test('sync retries after reading temporarily empty config content', async () => {
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.synchronization.type = 'api';
  const { fs } = createMockFs(stringifyToml(diskConfig));
  vi.spyOn(fs, 'readFile').mockResolvedValueOnce('' as never);

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');
  const store = useConfigStore();

  await store.sync();
  await store.sync();

  expect(store.config.synchronization.type).toBe('api');
});

test('sync waits for the filesystem mount before reading config metadata', async () => {
  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const fileInfoSpy = vi.spyOn(fs, 'fileInfo');
  let resolveMount: ((mounted: boolean) => void) | undefined;
  const mountPromise = new Promise<boolean>((resolve) => {
    resolveMount = resolve;
  });
  fs.mount = vi.fn(() => mountPromise);

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  fsManager.currentFsName = 'mock-fs';
  useSettingsStore().settings.vault = '/';
  const store = useConfigStore();

  await store.sync();

  expect(fileInfoSpy).not.toHaveBeenCalled();
  resolveMount?.(true);
  await fsManager.useFs('mock-fs');
  await vi.waitFor(() => expect(fileInfoSpy).toHaveBeenCalled());
  await store.sync();
});

test('records config-store-load lifecycle events instead of sync events on load', async () => {
  const infoSpy = vi.spyOn(logger, 'info');
  const rawFs: FileSystem = {
    readFile: vi.fn(async () => stringifyToml(clone()(DEFAULT_CONFIG))) as typeof rawFs.readFile,
    writeFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    fileInfo: vi.fn(async () => ({
      name: 'config.toml',
      path: '/.orgnote/config.toml',
      mtime: 123,
      size: 0,
      type: 'file' as const,
    })),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    mkdir: vi.fn(async () => undefined),
    isDirExist: vi.fn(async () => true),
    isFileExist: vi.fn(async () => true),
    utimeSync: vi.fn(async () => undefined),
  };

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'load-event-fs', fs: () => rawFs, type: 'web' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('load-event-fs');

  const store = useConfigStore();
  await store.sync();

  const loggedEvents = infoSpy.mock.calls.map((call) => (call[1] as { event?: string })?.event);
  expect(loggedEvents).toContain('config-store-load-requested');
  expect(loggedEvents).toContain('config-store-load-completed');
  expect(loggedEvents).not.toContain('config-store-sync-requested');
  expect(loggedEvents).not.toContain('config-store-sync-completed');
});
