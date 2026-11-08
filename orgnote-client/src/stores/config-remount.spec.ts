import { test, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { useFileSystemManagerStore } from './file-system-manager';
import { useSettingsStore } from './settings';
import { stringifyToml } from 'orgnote-api/utils';
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

test('same-context remount reloads updated disk config', async () => {
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.system.language = 'ru-RU';
  const { fs, files } = createMockFs(stringifyToml(diskConfig));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();
  expect(store.config.system.language).toBe('ru-RU');

  const updatedConfig = clone()(DEFAULT_CONFIG);
  updatedConfig.system.language = 'ja-JP';
  files.set('/.orgnote/config.toml', {
    ...createDiskFile('/.orgnote/config.toml', 999, 100),
    content: stringifyToml(updatedConfig),
  });

  fsManager.fsMounted = false;
  await nextTick();
  await fsManager.useFs('mock-fs');

  await vi.waitFor(() => expect(store.config.system.language).toBe('ja-JP'));
});

test('same-key remount invalidation cancels in-flight sync and runs fresh sync', async () => {
  let resolveFirstRead: (() => void) | undefined;
  const firstReadPromise = new Promise<void>((resolve) => {
    resolveFirstRead = resolve;
  });

  const diskConfig1 = clone()(DEFAULT_CONFIG);
  diskConfig1.system.language = 'es-ES';

  const { fs, files } = createMockFs(stringifyToml(diskConfig1));
  const originalReadFile = fs.readFile.bind(fs);
  let isFirstRead = true;
  fs.readFile = vi.fn(async (path, format) => {
    if (isFirstRead && path === '/.orgnote/config.toml') {
      isFirstRead = false;
      await firstReadPromise;
    }
    return originalReadFile(path, format);
  }) as typeof fs.readFile;

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'remount-fs', fs: () => fs, type: 'web', initialVault: '/vault-1' });
  useSettingsStore().settings.vault = '/vault-1';
  await fsManager.useFs('remount-fs');

  const store = useConfigStore();
  const firstSync = store.sync();
  await vi.waitFor(() => expect(fs.readFile).toHaveBeenCalled());

  const diskConfig2 = clone()(DEFAULT_CONFIG);
  diskConfig2.system.language = 'it-IT';
  const config2Toml = stringifyToml(diskConfig2);
  files.set('/.orgnote/config.toml', {
    ...createDiskFile('/.orgnote/config.toml', 200, config2Toml.length),
    content: config2Toml,
  });

  fsManager.fsMounted = false;
  await nextTick();
  const remountPromise = fsManager.useFs('remount-fs');

  resolveFirstRead?.();
  await firstSync;
  await remountPromise;

  await vi.waitFor(() => expect(store.config.system.language).toBe('it-IT'));
});

test('same-context remount in same tick with no await invalidates in-flight sync and applies fresh sync', async () => {
  let resolveFirstRead: (() => void) | undefined;
  const firstReadPromise = new Promise<void>((resolve) => {
    resolveFirstRead = resolve;
  });

  const diskConfig1 = clone()(DEFAULT_CONFIG);
  diskConfig1.system.language = 'es-ES';

  const { fs, files } = createMockFs(stringifyToml(diskConfig1));
  const originalReadFile = fs.readFile.bind(fs);
  let isFirstRead = true;
  fs.readFile = vi.fn(async (path, format) => {
    if (isFirstRead && path === '/.orgnote/config.toml') {
      isFirstRead = false;
      await firstReadPromise;
      return stringifyToml(diskConfig1) as never;
    }
    return originalReadFile(path, format);
  }) as typeof fs.readFile;

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'remount-sync-fs', fs: () => fs, type: 'web', initialVault: '/vault-sync' });
  useSettingsStore().settings.vault = '/vault-sync';
  await fsManager.useFs('remount-sync-fs');

  const store = useConfigStore();
  const firstSync = store.sync();
  await vi.waitFor(() => expect(fs.readFile).toHaveBeenCalled());

  const diskConfig2 = clone()(DEFAULT_CONFIG);
  diskConfig2.system.language = 'it-IT';
  const config2Toml = stringifyToml(diskConfig2);
  files.set('/.orgnote/config.toml', {
    ...createDiskFile('/.orgnote/config.toml', 200, config2Toml.length),
    content: config2Toml,
  });

  fsManager.fsMounted = false;
  const remountPromise = fsManager.useFs('remount-sync-fs');

  resolveFirstRead?.();
  await firstSync;
  await remountPromise;

  await vi.waitFor(() => expect(store.config.system.language).toBe('it-IT'));
});
