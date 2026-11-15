import { test, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { useFileSystemManagerStore } from './file-system-manager';
import { useSettingsStore } from './settings';
import { stringifyToml } from 'orgnote-api/utils';
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

test('pending debounced config save does not execute against a later storage context', async () => {
  vi.useFakeTimers();
  const { fs: fsA } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  const { fs: fsB, files: filesB } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  const settingsStore = useSettingsStore();
  settingsStore.settings.vault = '/vault-a';
  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  await store.sync();

  store.config.system.language = 'es-ES';
  await vi.advanceTimersByTimeAsync(100);

  const fsBWriteSpy = vi.spyOn(fsB, 'writeFile');

  settingsStore.settings.vault = '/vault-b';
  fsManager.currentFsName = 'fs-b';
  fsManager.fsMounted = false;

  await vi.advanceTimersByTimeAsync(1500);

  expect(fsBWriteSpy).not.toHaveBeenCalled();
  expect(filesB.get('/.orgnote/config.toml')?.content).not.toContain('es-ES');
  vi.useRealTimers();
});

test('user config mutation during in-flight same-context reinitialization is preserved and persisted', async () => {
  vi.useFakeTimers();
  let resolveReadFile: ((content: string) => void) | undefined;
  const readFilePromise = new Promise<string>((resolve) => {
    resolveReadFile = resolve;
  });

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

  fs.readFile = vi.fn(() => readFilePromise as never);
  fsManager.fsMounted = false;
  await nextTick();
  await fsManager.useFs('mock-fs');

  await vi.waitFor(() => expect(fs.readFile).toHaveBeenCalled());

  store.config.system.language = 'es-ES';

  resolveReadFile?.(stringifyToml(diskConfig));

  await vi.waitFor(() => expect(store.config.system.language).toBe('es-ES'));

  await vi.advanceTimersByTimeAsync(1500);
  expect(files.get('/.orgnote/config.toml')?.content).toContain('es-ES');
  vi.useRealTimers();
});

test('same-context remount before debounced save retains and persists user mutation', async () => {
  vi.useFakeTimers();
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

  store.config.system.language = 'es-ES';

  await vi.advanceTimersByTimeAsync(500);
  fsManager.fsMounted = false;
  await nextTick();
  await fsManager.useFs('mock-fs');

  await vi.waitFor(() => expect(store.config.system.language).toBe('es-ES'));

  await vi.advanceTimersByTimeAsync(1500);
  expect(files.get('/.orgnote/config.toml')?.content).toContain('es-ES');
  vi.useRealTimers();
});

test('failed config save retains user mutation across subsequent sync and retries', async () => {
  vi.useFakeTimers();
  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.system.language = 'ru-RU';
  const { fs, files } = createMockFs(stringifyToml(diskConfig));

  let shouldFailWrite = true;
  const originalWrite = fs.writeFile.bind(fs);
  fs.writeFile = vi.fn(async (path, content) => {
    if (shouldFailWrite && path === '/.orgnote/config.toml') {
      throw new Error('Disk write failed');
    }
    return originalWrite(path, content);
  });

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();
  expect(store.config.system.language).toBe('ru-RU');

  store.config.system.language = 'de-DE';

  await vi.advanceTimersByTimeAsync(1500);
  expect(files.get('/.orgnote/config.toml')?.content).toContain('ru-RU');

  fsManager.fsMounted = false;
  await nextTick();
  await fsManager.useFs('mock-fs');

  await vi.waitFor(() => expect(store.config.system.language).toBe('de-DE'));

  shouldFailWrite = false;
  await vi.advanceTimersByTimeAsync(1500);
  expect(files.get('/.orgnote/config.toml')?.content).toContain('de-DE');
  vi.useRealTimers();
});

test('second mutation during in-flight write survives write completion and remount', async () => {
  vi.useFakeTimers();
  let resolveFirstWrite: (() => void) | undefined;
  const firstWritePromise = new Promise<void>((resolve) => {
    resolveFirstWrite = resolve;
  });

  const diskConfig = clone()(DEFAULT_CONFIG);
  diskConfig.system.language = 'ru-RU';
  const { fs, files } = createMockFs(stringifyToml(diskConfig));

  let isFirstWriteCall = true;
  const originalWrite = fs.writeFile.bind(fs);
  fs.writeFile = vi.fn(async (path, content, format) => {
    if (isFirstWriteCall && path === '/.orgnote/config.toml') {
      isFirstWriteCall = false;
      await firstWritePromise;
    }
    return originalWrite(path, content, format);
  });

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();
  expect(store.config.system.language).toBe('ru-RU');

  store.config.system.language = 'es-ES';
  await vi.advanceTimersByTimeAsync(1500);
  expect(fs.writeFile).toHaveBeenCalled();

  store.config.system.language = 'de-DE';

  resolveFirstWrite?.();
  await vi.advanceTimersByTimeAsync(100);

  fsManager.fsMounted = false;
  await nextTick();
  await fsManager.useFs('mock-fs');

  await vi.waitFor(() => expect(store.config.system.language).toBe('de-DE'));

  await vi.advanceTimersByTimeAsync(1500);
  expect(files.get('/.orgnote/config.toml')?.content).toContain('de-DE');
  vi.useRealTimers();
});

test('config mutation in context A followed by context switch in same tick is not merged into context B', async () => {
  const configA = clone()(DEFAULT_CONFIG);
  configA.system.language = 'ru-RU';
  const { fs: fsA } = createMockFs(stringifyToml(configA));

  const configB = clone()(DEFAULT_CONFIG);
  configB.system.language = 'ja-JP';
  const { fs: fsB, files: filesB } = createMockFs(stringifyToml(configB));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  useSettingsStore().settings.vault = '/vault-a';
  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  await store.sync();
  expect(store.config.system.language).toBe('ru-RU');

  store.config.system.language = 'fr-FR';
  useSettingsStore().settings.vault = '/vault-b';
  await fsManager.useFs('fs-b');
  await store.sync();

  expect(store.config.system.language).toBe('ja-JP');
  expect(filesB.get('/.orgnote/config.toml')?.content).toContain('ja-JP');
  expect(filesB.get('/.orgnote/config.toml')?.content).not.toContain('fr-FR');
});

test('user mutation while switched context disk read is blocked merges only mutated field into disk config', async () => {
  const configA = clone()(DEFAULT_CONFIG);
  configA.system.language = 'ru-RU';
  configA.synchronization.type = 'api';
  const { fs: fsA } = createMockFs(stringifyToml(configA));

  let resolveReadB: (() => void) | undefined;
  const readBPromise = new Promise<void>((resolve) => {
    resolveReadB = resolve;
  });

  const configB = clone()(DEFAULT_CONFIG);
  configB.system.language = 'ja-JP';
  configB.synchronization.type = 'none';
  const { fs: fsB } = createMockFs(stringifyToml(configB));

  const originalBReadFile = fsB.readFile.bind(fsB);
  fsB.readFile = vi.fn(async (path, format) => {
    await readBPromise;
    return originalBReadFile(path, format);
  }) as typeof fsB.readFile;

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  useSettingsStore().settings.vault = '/vault-a';
  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  await store.sync();
  expect(store.config.system.language).toBe('ru-RU');
  expect(store.config.editor.showSpecialSymbols).toBe(false);

  useSettingsStore().settings.vault = '/vault-b';
  await fsManager.useFs('fs-b');

  const syncBPromise = store.sync();
  await vi.waitFor(() => expect(fsB.readFile).toHaveBeenCalled());

  store.config.editor.showSpecialSymbols = true;

  resolveReadB?.();
  await syncBPromise;

  expect(store.config.system.language).toBe('ja-JP');
  expect(store.config.synchronization.type).toBe('none');
  expect(store.config.editor.showSpecialSymbols).toBe(true);
});
