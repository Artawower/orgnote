import 'fake-indexeddb/auto';
import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import type { DiskFile, FileSystem, FileSystemChange, FileSystemSession } from 'orgnote-api';

const mockFs = {
  readDir: vi.fn(async (...args: [string?]): Promise<DiskFile[]> => {
    void args;
    return [];
  }),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  deleteFile: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
};

let watcherCallbacks: Map<string, (change: FileSystemChange) => void>;

const mockFileWatcher = {
  watch: vi.fn((path: string, callback: (change: FileSystemChange) => void) => {
    watcherCallbacks.set(path, callback);
    return () => watcherCallbacks.delete(path);
  }),
};

let mockSession: FileSystemSession | null = null;

const mockFsManager = {
  get currentSession() {
    return mockSession;
  },
};

vi.mock('./file-system', () => ({
  useFileSystemStore: () => mockFs,
}));

vi.mock('./file-watcher', () => ({
  useFileWatcherStore: () => mockFileWatcher,
}));

vi.mock('./file-system-manager', () => ({
  useFileSystemManagerStore: () => mockFsManager,
}));

import { useFileManagerStore } from './file-manager';
import { resetStorageBoundStores } from 'src/infrastructure/stores/storage-bound-store';

const createDiskFile = (overrides: Partial<DiskFile>): DiskFile =>
  ({
    path: '/test/file',
    name: 'file',
    type: 'file',
    mtime: 1,
    ...overrides,
  }) as DiskFile;

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createPinia());
  vi.clearAllMocks();
  watcherCallbacks = new Map();
  mockSession = {
    id: 1,
    fs: mockFs as unknown as FileSystem,
    fsName: 'test-fs',
    root: '/',
    storageKey: 'test-fs:/',
  };
});

afterEach(() => {
  vi.useRealTimers();
});

test('loadFiles populates files from filesystem', async () => {
  const store = useFileManagerStore();
  mockFs.readDir.mockClear();

  const fileA = createDiskFile({ path: '/a.org', name: 'a.org' });
  const fileB = createDiskFile({ path: '/b.org', name: 'b.org' });
  mockFs.readDir.mockResolvedValueOnce([fileA, fileB]);

  await store.loadFiles();

  expect(store.files).toEqual([fileA, fileB]);
  expect(mockFs.readDir).toHaveBeenCalledWith('/');
});

test('loadFiles ignores stale directory results after path changes', async () => {
  let resolveInitialRead: ((files: DiskFile[]) => void) | undefined;

  mockFs.readDir.mockReset();
  mockFs.readDir.mockImplementation((path?: string) => {
    if (path === '/') {
      return new Promise<DiskFile[]>((resolve) => {
        resolveInitialRead = resolve;
      });
    }

    if (path === '/docs') {
      return Promise.resolve([createDiskFile({ path: '/docs/next.org', name: 'next.org' })]);
    }

    return Promise.resolve([]);
  });

  const store = useFileManagerStore();

  store.path = '/docs';
  await nextTick();

  resolveInitialRead?.([createDiskFile({ path: '/stale.org', name: 'stale.org' })]);
  await nextTick();

  expect(store.files.map((file) => file.path)).toEqual(['/docs/next.org']);
});

test('sortedFiles returns files sorted by default config (name asc, directories first)', () => {
  const store = useFileManagerStore();

  const dir = createDiskFile({ name: 'zulu', path: '/zulu', type: 'directory' });
  const fileA = createDiskFile({ name: 'b.org', path: '/b.org' });
  const fileB = createDiskFile({ name: 'a.org', path: '/a.org' });
  store.files = [fileA, fileB, dir];

  expect(store.sortedFiles.map((f) => f.name)).toEqual(['zulu', 'a.org', 'b.org']);
});

test('sortedFiles reacts to sortConfig changes', () => {
  const store = useFileManagerStore();

  const fileSmall = createDiskFile({ name: 'small.org', path: '/small.org', size: 10 });
  const fileLarge = createDiskFile({ name: 'large.org', path: '/large.org', size: 999 });
  store.files = [fileSmall, fileLarge];

  store.sortConfig = { field: 'size', direction: 'desc', directoriesFirst: false };

  expect(store.sortedFiles.map((f) => f.name)).toEqual(['large.org', 'small.org']);
});

test('sortedFiles reacts to files changes', () => {
  const store = useFileManagerStore();

  store.files = [createDiskFile({ name: 'c.org', path: '/c.org' })];
  expect(store.sortedFiles.length).toBe(1);

  store.files = [
    createDiskFile({ name: 'c.org', path: '/c.org' }),
    createDiskFile({ name: 'a.org', path: '/a.org' }),
  ];
  expect(store.sortedFiles.map((f) => f.name)).toEqual(['a.org', 'c.org']);
});

test('sortConfig defaults to name ascending with directories first', () => {
  const store = useFileManagerStore();

  expect(store.sortConfig).toEqual({
    field: 'name',
    direction: 'asc',
    directoriesFirst: true,
  });
});

test('createFile uses files ref instead of re-reading directory', async () => {
  const store = useFileManagerStore();
  mockFs.readDir.mockClear();
  store.files = [createDiskFile({ name: 'existing.org', path: '/docs/existing.org' })];

  await store.createFile();

  expect(mockFs.readDir).not.toHaveBeenCalled();
  expect(mockFs.writeFile).toHaveBeenCalled();
});

test('createFolder uses files ref instead of re-reading directory', async () => {
  const store = useFileManagerStore();
  mockFs.readDir.mockClear();
  store.files = [createDiskFile({ name: 'existing', path: '/docs/existing', type: 'directory' })];

  await store.createFolder();

  expect(mockFs.readDir).not.toHaveBeenCalled();
  expect(mockFs.mkdir).toHaveBeenCalled();
});

test('store loads files and starts fileWatcher on init', () => {
  useFileManagerStore();

  expect(mockFs.readDir).toHaveBeenCalledWith('/');
  expect(mockFileWatcher.watch).toHaveBeenCalledWith('/', expect.any(Function), {
    recursive: false,
  });
  expect(watcherCallbacks.has('/')).toBe(true);
});

test('store reloads files and switches fileWatcher when path changes', async () => {
  const store = useFileManagerStore();
  mockFs.readDir.mockClear();
  mockFileWatcher.watch.mockClear();

  store.path = '/docs';
  await nextTick();

  expect(mockFs.readDir).toHaveBeenCalledWith('/docs');
  expect(watcherCallbacks.has('/')).toBe(false);
  expect(watcherCallbacks.has('/docs')).toBe(true);
});

test('store refreshes files when fileWatcher notifies change', async () => {
  useFileManagerStore();
  mockFs.readDir.mockClear();

  const callback = watcherCallbacks.get('/');
  callback?.({ path: '/a.org', type: 'modify', mtime: 2 });
  await vi.advanceTimersByTimeAsync(150);

  expect(mockFs.readDir).toHaveBeenCalledWith('/');
});

test('$resetStorage restores default file manager state', async () => {
  const store = useFileManagerStore();
  store.path = '/custom/path';
  store.focusFile = createDiskFile({ path: '/custom/path/file.org' });
  store.searchQuery = 'keyword';
  store.mobileFileSearchActive = true;
  store.files = [createDiskFile({ path: '/custom/path/file.org' })];
  store.toggleSelection('/custom/path/file.org');
  store.startCopy(['/custom/path/file.org']);

  await resetStorageBoundStores();

  expect(store.path).toBe('/');
  expect(store.focusFile).toBeUndefined();
  expect(store.searchQuery).toBe('');
  expect(store.mobileFileSearchActive).toBe(false);
  expect(store.files).toEqual([]);
  expect(store.selectedFiles.size).toBe(0);
  expect(store.selectionMode).toBe(false);
  expect(store.pendingOperation).toBeUndefined();
});

test('$resetStorage invalidates in-flight read and cancels pending debounced refresh', async () => {
  let resolveReadDir: (files: DiskFile[]) => void = () => {};
  mockFs.readDir.mockImplementation(
    () =>
      new Promise<DiskFile[]>((resolve) => {
        resolveReadDir = resolve;
      }),
  );

  const store = useFileManagerStore();
  const watcherCallback = watcherCallbacks.get('/');
  watcherCallback?.({ path: '/a.org', type: 'modify', mtime: 2 });

  await resetStorageBoundStores();
  resolveReadDir([createDiskFile({ path: '/old-fs-file.org' })]);
  await vi.advanceTimersByTimeAsync(200);

  expect(store.files).toEqual([]);
});

test('path reset itself cannot schedule an old-session load', async () => {
  const store = useFileManagerStore();
  store.path = '/docs';
  mockFs.readDir.mockClear();

  mockSession = null;
  await resetStorageBoundStores();
  await vi.advanceTimersByTimeAsync(200);

  expect(mockFs.readDir).not.toHaveBeenCalled();
});
