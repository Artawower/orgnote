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

test('toggleSelection adds path when not selected', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/docs/note.org');

  expect(store.selectedFiles.has('/docs/note.org')).toBe(true);
  expect(store.selectedFiles.size).toBe(1);
});

test('toggleSelection removes path when already selected', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/docs/note.org');
  store.toggleSelection('/docs/note.org');

  expect(store.selectedFiles.has('/docs/note.org')).toBe(false);
  expect(store.selectedFiles.size).toBe(0);
});

test('clearSelection empties selected files and disables selectionMode', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');
  store.toggleSelection('/b.org');
  expect(store.selectionMode).toBe(true);

  store.clearSelection();

  expect(store.selectedFiles.size).toBe(0);
  expect(store.selectionMode).toBe(false);
});

test('selectionMode is false when no files selected', () => {
  const store = useFileManagerStore();

  expect(store.selectionMode).toBe(false);
});

test('selectionMode is true when files are selected', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');

  expect(store.selectionMode).toBe(true);
});

test('selectFiles selects all items including directories', () => {
  const store = useFileManagerStore();

  const files: DiskFile[] = [
    createDiskFile({ path: '/docs/note.org', name: 'note.org', type: 'file' }),
    createDiskFile({ path: '/docs/images', name: 'images', type: 'directory' }),
    createDiskFile({ path: '/docs/todo.org', name: 'todo.org', type: 'file' }),
  ];

  store.selectFiles(files);

  expect(store.selectedFiles.size).toBe(3);
  expect(store.selectedFiles.has('/docs/note.org')).toBe(true);
  expect(store.selectedFiles.has('/docs/images')).toBe(true);
  expect(store.selectedFiles.has('/docs/todo.org')).toBe(true);
});

test('selectFiles replaces previous selection', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/old/file.org');
  expect(store.selectedFiles.size).toBe(1);

  const files: DiskFile[] = [
    createDiskFile({ path: '/new/a.org', name: 'a.org', type: 'file' }),
    createDiskFile({ path: '/new/b.org', name: 'b.org', type: 'file' }),
  ];

  store.selectFiles(files);

  expect(store.selectedFiles.size).toBe(2);
  expect(store.selectedFiles.has('/old/file.org')).toBe(false);
  expect(store.selectedFiles.has('/new/a.org')).toBe(true);
  expect(store.selectedFiles.has('/new/b.org')).toBe(true);
});

test('operationTargets returns selected files when selection exists', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');
  store.toggleSelection('/b.org');

  expect(store.operationTargets).toEqual(['/a.org', '/b.org']);
});

test('operationTargets returns focusFile path when no selection', () => {
  const store = useFileManagerStore();
  store.focusFile = createDiskFile({ path: '/focused.org', name: 'focused.org' });

  expect(store.operationTargets).toEqual(['/focused.org']);
});

test('operationTargets returns empty array when no selection and no focusFile', () => {
  const store = useFileManagerStore();

  expect(store.operationTargets).toEqual([]);
});

test('startCopy sets pending copy operation and clears selection', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');
  store.startCopy(['/a.org']);

  expect(store.pendingOperation).toEqual({ type: 'copy', paths: ['/a.org'] });
  expect(store.selectedFiles.size).toBe(0);
});

test('startMove sets pending move operation and clears selection', () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');
  store.startMove(['/a.org']);

  expect(store.pendingOperation).toEqual({ type: 'move', paths: ['/a.org'] });
  expect(store.selectedFiles.size).toBe(0);
});

test('executePending calls copyFile for copy operation and resets pending', async () => {
  const store = useFileManagerStore();

  store.startCopy(['/src/a.org', '/src/b.org']);
  await store.executePending('/dest');

  expect(mockFs.copyFile).toHaveBeenCalledWith('/src/a.org', '/dest/a.org');
  expect(mockFs.copyFile).toHaveBeenCalledWith('/src/b.org', '/dest/b.org');
  expect(mockFs.copyFile).toHaveBeenCalledTimes(2);
  expect(store.pendingOperation).toBeUndefined();
});

test('executePending calls rename for move operation and resets pending', async () => {
  const store = useFileManagerStore();

  store.startMove(['/src/file.org']);
  await store.executePending('/dest');

  expect(mockFs.rename).toHaveBeenCalledWith('/src/file.org', '/dest/file.org');
  expect(mockFs.rename).toHaveBeenCalledTimes(1);
  expect(store.pendingOperation).toBeUndefined();
});

test('executePending does nothing when no pending operation', async () => {
  const store = useFileManagerStore();

  await store.executePending('/dest');

  expect(mockFs.copyFile).not.toHaveBeenCalled();
  expect(mockFs.rename).not.toHaveBeenCalled();
});

test('cancelPending resets pending operation', () => {
  const store = useFileManagerStore();

  store.startCopy(['/a.org']);
  expect(store.pendingOperation).toBeDefined();

  store.cancelPending();

  expect(store.pendingOperation).toBeUndefined();
});

test('deleteFiles calls deleteFile for each path and clears selection', async () => {
  const store = useFileManagerStore();

  store.toggleSelection('/a.org');
  store.toggleSelection('/b.org');
  await store.deleteFiles(['/a.org', '/b.org']);

  expect(mockFs.deleteFile).toHaveBeenCalledWith('/a.org');
  expect(mockFs.deleteFile).toHaveBeenCalledWith('/b.org');
  expect(mockFs.deleteFile).toHaveBeenCalledTimes(2);
  expect(store.selectedFiles.size).toBe(0);
});

test('executePending clears selection after copy', async () => {
  const store = useFileManagerStore();

  store.toggleSelection('/other.org');
  store.startCopy(['/src/a.org']);
  store.toggleSelection('/stale.org');
  await store.executePending('/dest');

  expect(store.selectedFiles.size).toBe(0);
});

test('selectedFiles ignores stale Pinia state and remains a functional Set', async () => {
  const pinia = createPinia();
  setActivePinia(pinia);

  pinia.state.value['file-manager'] = {
    selectedFiles: {},
  };

  const store = useFileManagerStore();
  await nextTick();

  expect(store.selectedFiles).toBeInstanceOf(Set);
  expect(store.selectionMode).toBe(false);

  store.toggleSelection('/a.org');
  expect(store.selectionMode).toBe(true);
  expect(store.selectedFiles.has('/a.org')).toBe(true);
});
