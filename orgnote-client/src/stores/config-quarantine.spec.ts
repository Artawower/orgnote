import { test, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import clone from 'rfdc';
import { useConfigStore } from './config';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { ErrorFileNotFound, type FileSystem } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { useSettingsStore } from './settings';
import { stringifyToml } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { logger } from 'src/boot/logger';
import { safeWriteFile, type ConfigStorageContext } from 'src/infrastructure/config/config-storage';
import { createMockFs, mountMockFileSystem } from './config-test-fixtures';

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

test('sync quarantines invalid config.toml', async () => {
  const { fs, files } = createMockFs('invalid = [toml');
  await mountMockFileSystem(fs);

  const store = useConfigStore();
  await store.sync();

  expect(files.has('/.orgnote/config-broken-1.toml')).toBe(true);
  expect(files.get('/.orgnote/config.toml')?.content).toBe(stringifyToml(clone()(DEFAULT_CONFIG)));
  expect(reporter.reportError).toHaveBeenCalled();
});

test('sync remains retryable and uninitialized if quarantine or reset of invalid config fails', async () => {
  const { fs, files } = createMockFs('invalid = [toml');
  let isWriteFailing = true;
  const originalWriteFile = fs.writeFile.bind(fs);
  fs.writeFile = vi.fn(async (path, content) => {
    if (isWriteFailing) throw new Error('Disk write failed during quarantine');
    return originalWriteFile(path, content);
  });
  fs.rename = vi.fn(async () => {
    throw new Error('Rename failed');
  });

  await mountMockFileSystem(fs);

  const store = useConfigStore();
  await store.sync();

  expect(files.has('/.orgnote/config-broken-1.toml')).toBe(false);
  expect(reporter.reportError).toHaveBeenCalled();

  isWriteFailing = false;
  await store.sync();

  expect(files.has('/.orgnote/config-broken-1.toml')).toBe(true);
  expect(files.get('/.orgnote/config.toml')?.content).toBe(stringifyToml(clone()(DEFAULT_CONFIG)));
});

test('stale quarantine transaction awaiting I/O does not rename, write defaults, or reset memory in a later context', async () => {
  let resolveRename: (() => void) | undefined;
  const renamePromise = new Promise<void>((resolve) => {
    resolveRename = resolve;
  });

  const { fs: fsA } = createMockFs('invalid = [broken');
  fsA.rename = vi.fn(async () => {
    await renamePromise;
  });

  const validConfig = clone()(DEFAULT_CONFIG);
  validConfig.system.language = 'ja-JP';
  const { fs: fsB, files: filesB } = createMockFs(stringifyToml(validConfig));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  useSettingsStore().settings.vault = '/vault-a';
  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  const syncPromiseA = store.sync();
  await vi.waitFor(() => expect(fsA.rename).toHaveBeenCalled());

  useSettingsStore().settings.vault = '/vault-b';
  await fsManager.useFs('fs-b');
  await store.sync();

  expect(store.config.system.language).toBe('ja-JP');
  expect(filesB.get('/.orgnote/config.toml')?.content).toContain('ja-JP');

  resolveRename?.();
  await syncPromiseA;

  expect(store.config.system.language).toBe('ja-JP');
  expect(filesB.get('/.orgnote/config.toml')?.content).toContain('ja-JP');
  expect(filesB.has('/.orgnote/config-broken-1.toml')).toBe(false);
});

test('sync sets configErrors for schema-invalid config.toml', async () => {
  const { fs, files } = createMockFs('system = { language = 123 }');
  await mountMockFileSystem(fs);

  const store = useConfigStore();
  await store.sync();

  expect(files.has('/.orgnote/config-broken-1.toml')).toBe(true);
  expect(store.configErrors.length).toBeGreaterThan(0);
});

test('ErrorFileNotFound folder fallback after context switch never writes or retries on new context', async () => {
  let resolveMkdir: (() => void) | undefined;
  const mkdirPromise = new Promise<void>((resolve) => {
    resolveMkdir = resolve;
  });

  const { fs: fsA, files: filesA } = createMockFs('');
  filesA.delete('/.orgnote/config.toml');
  let firstWrite = true;
  fsA.writeFile = vi.fn(async () => {
    if (firstWrite) {
      firstWrite = false;
      throw new ErrorFileNotFound('/.orgnote/config.toml');
    }
  });
  fsA.init = async () => ({ root: '/vault-a' });
  fsA.isDirExist = vi.fn(async () => false);
  fsA.mkdir = vi.fn(async () => {
    await mkdirPromise;
  });

  const validB = clone()(DEFAULT_CONFIG);
  validB.system.language = 'ja-JP';
  const { fs: fsB, files: filesB } = createMockFs(stringifyToml(validB));
  fsB.init = async () => ({ root: '/vault-b' });
  const fsBWriteSpy = vi.spyOn(fsB, 'writeFile');
  const fsBMkdirSpy = vi.spyOn(fsB, 'mkdir');

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'fs-a', fs: () => fsA, type: 'web', initialVault: '/vault-a' });
  fsManager.register({ name: 'fs-b', fs: () => fsB, type: 'web', initialVault: '/vault-b' });

  await fsManager.useFs('fs-a');

  const store = useConfigStore();
  const syncA = store.sync();
  await vi.waitFor(() => expect(fsA.mkdir).toHaveBeenCalled());

  useSettingsStore().settings.vault = '/vault-b';
  await fsManager.useFs('fs-b');
  await store.sync();

  expect(store.config.system.language).toBe('ja-JP');
  expect(filesB.get('/.orgnote/config.toml')?.content).toContain('ja-JP');
  fsBWriteSpy.mockClear();

  resolveMkdir?.();
  await syncA;

  expect(fsBWriteSpy).not.toHaveBeenCalled();
  expect(fsBMkdirSpy).not.toHaveBeenCalled();
  expect(filesB.get('/.orgnote/config.toml')?.content).toContain('ja-JP');
});

test('logs lifecycle trace events for read, metadata, write failure, and empty config read', async () => {
  const { fs } = createMockFs(stringifyToml(clone()(DEFAULT_CONFIG)));
  fs.fileInfo = vi.fn().mockRejectedValue(new Error('metadata error'));

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'mock-fs', fs: () => fs, type: 'web', initialVault: '/' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('mock-fs');

  const store = useConfigStore();
  await store.sync();

  expect(logger.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event: 'config-metadata-read-failed' }),
  );

  fs.fileInfo = vi.fn().mockResolvedValue({ path: '/.orgnote/config.toml', mtime: 10, type: 'file' } as never);
  fs.readFile = vi.fn().mockRejectedValue(new Error('read error'));
  await store.sync();

  expect(logger.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event: 'config-read-failed' }),
  );

  fs.readFile = vi.fn().mockResolvedValue('' as never);
  await store.sync();

  expect(logger.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event: 'empty-config-read-deferred' }),
  );

  fs.readFile = vi.fn().mockResolvedValue(stringifyToml(clone()(DEFAULT_CONFIG)) as never);
  await store.sync();

  fs.writeFile = vi.fn().mockRejectedValue(new Error('write error'));
  vi.useFakeTimers();
  store.config.system.language = 'fr-FR';
  await vi.advanceTimersByTimeAsync(1500);

  expect(logger.info).toHaveBeenCalledWith(
    'Config lifecycle',
    expect.objectContaining({ event: 'config-write-failed' }),
  );
  vi.useRealTimers();
});

test('safeWriteFile nested directory creation fallback and watcher emit complete and release gate', async () => {
  let dirExists = false;
  let fileCreated = false;
  let writeFileCalls = 0;
  const watcher = { emitChange: vi.fn(async () => undefined) };

  const fs: FileSystem = {
    writeFile: vi.fn(async () => {
      writeFileCalls++;
      if (!dirExists) throw new ErrorFileNotFound('dir missing');
      fileCreated = true;
    }),
    isDirExist: vi.fn(async () => dirExists),
    mkdir: vi.fn(async () => {
      dirExists = true;
    }),
    fileInfo: vi.fn(async () => ({
      name: 'config.toml',
      path: '/.orgnote/config.toml',
      mtime: 123,
      size: 10,
      type: 'file' as const,
    })),
    readFile: vi.fn(async () => '') as typeof fs.readFile,
    readDir: vi.fn(async () => []),
    rename: vi.fn(async () => undefined),
    deleteFile: vi.fn(async () => undefined),
    rmdir: vi.fn(async () => undefined),
    isFileExist: vi.fn(async () => fileCreated),
    utimeSync: vi.fn(async () => undefined),
  };

  const fsManager = useFileSystemManagerStore();
  fsManager.register({ name: 'test-fs', fs: () => fs, type: 'web' });
  useSettingsStore().settings.vault = '/';
  await fsManager.useFs('test-fs');
  const activeSession = fsManager.currentSession!;
  const ctx: ConfigStorageContext = {
    session: activeSession,
    isActive: () => true,
    run: (op) => fsManager.runWithMountedFileSystem(activeSession, op),
  };

  const writeResult = await safeWriteFile(ctx, watcher, '/.orgnote/config.toml', 'test content');
  expect(writeResult).toBe(true);
  expect(writeFileCalls).toBe(2);
  expect(fs.mkdir).toHaveBeenCalledWith('/.orgnote');
  expect(watcher.emitChange).toHaveBeenCalledWith(
    expect.objectContaining({ path: '/.orgnote/config.toml', type: 'modify', mtime: 123 }),
  );

  let subsequentOpRan = false;
  await fsManager.runWithMountedFileSystem(activeSession, async () => {
    subsequentOpRan = true;
  });
  expect(subsequentOpRan).toBe(true);
});
