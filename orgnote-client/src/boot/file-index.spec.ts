import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import fileIndexBoot from './file-index';
import type { DiskFile, FileMeta } from 'orgnote-api';

type FileChange = {
  path: string;
  type: 'create' | 'modify' | 'delete' | 'rename';
  previousPath?: string;
};

const watcherState = {
  isWatching: ref(true),
};

const fileSystemManagerState = {
  fsMounted: ref(true),
};

const searchState = {
  isIndexing: false,
  isIndexingRef: ref(false),
  processFile: vi.fn(async () => {}),
  removeFile: vi.fn(async () => {}),
};

const commandsState = {
  execute: vi.fn(async () => {}),
};

const mockDirEntries = new Map<string, DiskFile[]>();
const mockFileInfoByPath = new Map<string, DiskFile | undefined>();
const mockIndexedFiles: FileMeta[] = [];

let watchedCallback: ((change: FileChange) => Promise<void> | void) | undefined;

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    watch: (
      source: { value: unknown } | (() => unknown),
      callback: (value: unknown) => void,
      options?: { immediate?: boolean },
    ) => {
      let stopped = false;
      const stop = () => {
        stopped = true;
      };

      if (options?.immediate) {
        Promise.resolve().then(() => {
          if (stopped) {
            return;
          }

          const value = typeof source === 'function' ? source() : source.value;
          callback(value);
        });
      }

      return stop;
    },
  };
});

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia');
  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) => {
      return Object.entries(store).reduce<Record<string, unknown>>((refs, [key, value]) => {
        if (key === 'isIndexing' && typeof value === 'boolean') {
          refs[key] = searchState.isIndexingRef;
          return refs;
        }

        if (value && typeof value === 'object' && 'value' in (value as object)) {
          refs[key] = value;
        }
        return refs;
      }, {});
    },
  };
});

vi.mock('src/stores/file-watcher', () => ({
  useFileWatcherStore: vi.fn(() => ({
    isWatching: watcherState.isWatching,
    watch: vi.fn((path: string, callback: (change: FileChange) => Promise<void> | void) => {
      if (path === '/') {
        watchedCallback = callback;
      }
      return () => {};
    }),
  })),
}));

vi.mock('src/stores/file-search', () => ({
  useFileSearchStore: vi.fn(() => ({
    isIndexing: searchState.isIndexing,
    processFile: searchState.processFile,
    removeFile: searchState.removeFile,
  })),
}));

vi.mock('src/stores/file-system-manager', () => ({
  useFileSystemManagerStore: vi.fn(() => fileSystemManagerState),
}));

vi.mock('src/stores/file-system', () => ({
  useFileSystemStore: vi.fn(() => ({
    readDir: vi.fn(async (path: string) => mockDirEntries.get(path) ?? []),
    fileInfo: vi.fn(async (path: string) => mockFileInfoByPath.get(path)),
  })),
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    fileRepository: {
      getAll: vi.fn(async () => mockIndexedFiles),
    },
  },
}));

vi.mock('src/stores/command', () => ({
  useCommandsStore: vi.fn(() => commandsState),
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: vi.fn() },
}));

beforeEach(() => {
  watchedCallback = undefined;
  watcherState.isWatching.value = true;
  fileSystemManagerState.fsMounted.value = true;
  searchState.isIndexing = false;
  searchState.isIndexingRef.value = false;
  searchState.processFile.mockClear();
  searchState.removeFile.mockClear();
  commandsState.execute.mockClear();
  mockDirEntries.clear();
  mockFileInfoByPath.clear();
  mockIndexedFiles.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

test('file-index watcher removes old path and indexes new path on rename', async () => {
  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();
  expect(watchedCallback).toBeTypeOf('function');

  await watchedCallback?.({
    type: 'rename',
    path: '/new-name.org',
    previousPath: '/old-name.org',
  });

  expect(searchState.removeFile).toHaveBeenCalledTimes(1);
  expect(searchState.removeFile).toHaveBeenCalledWith({ path: ['old-name.org'] });

  expect(searchState.processFile).toHaveBeenCalledTimes(1);
  expect(searchState.processFile).toHaveBeenCalledWith('/new-name.org');
});

test('file-index watcher handles bulk rename by updating all old and new paths', async () => {
  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();
  expect(watchedCallback).toBeTypeOf('function');

  await watchedCallback?.({
    type: 'rename',
    path: '/archive/new-a.org',
    previousPath: '/inbox/old-a.org',
  });
  await watchedCallback?.({
    type: 'rename',
    path: '/archive/new-b.org',
    previousPath: '/inbox/old-b.org',
  });

  expect(searchState.removeFile).toHaveBeenNthCalledWith(1, { path: ['inbox', 'old-a.org'] });
  expect(searchState.removeFile).toHaveBeenNthCalledWith(2, { path: ['inbox', 'old-b.org'] });

  expect(searchState.processFile).toHaveBeenNthCalledWith(1, '/archive/new-a.org');
  expect(searchState.processFile).toHaveBeenNthCalledWith(2, '/archive/new-b.org');
});

test('file-index watcher removes stale index paths and reindexes on directory rename', async () => {
  mockIndexedFiles.push(
    {
      id: '/markdown/python/with, context-manager.org',
      filePath: ['markdown', 'python', 'with, context-manager.org'],
      title: 'with, context-manager',
    },
    {
      id: '/markdown/python/asyncio.org',
      filePath: ['markdown', 'python', 'asyncio.org'],
      title: 'asyncio',
    },
    {
      id: '/other/keep.org',
      filePath: ['other', 'keep.org'],
      title: 'keep',
    },
  );

  mockDirEntries.set('/python', [
    {
      name: 'with, context-manager.org',
      path: '/python/with, context-manager.org',
      type: 'file',
      size: 10,
      mtime: Date.now(),
    },
    {
      name: 'sub',
      path: '/python/sub',
      type: 'directory',
      size: 0,
      mtime: Date.now(),
    },
  ]);
  mockDirEntries.set('/python/sub', [
    {
      name: 'asyncio.org',
      path: '/python/sub/asyncio.org',
      type: 'file',
      size: 12,
      mtime: Date.now(),
    },
  ]);
  mockFileInfoByPath.set('/python', {
    name: 'python',
    path: '/python',
    type: 'directory',
    size: 0,
    mtime: Date.now(),
  });

  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();

  await watchedCallback?.({
    type: 'rename',
    path: '/python',
    previousPath: '/markdown/python',
  });

  expect(searchState.removeFile).toHaveBeenCalledWith({
    id: '/markdown/python/with, context-manager.org',
  });
  expect(searchState.removeFile).toHaveBeenCalledWith({ id: '/markdown/python/asyncio.org' });
  expect(searchState.removeFile).not.toHaveBeenCalledWith({ id: '/other/keep.org' });

  expect(searchState.processFile).toHaveBeenCalledWith('/python/with, context-manager.org');
  expect(searchState.processFile).toHaveBeenCalledWith('/python/sub/asyncio.org');
});

test('file-index watcher removes a single note by path on file delete', async () => {
  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();

  await watchedCallback?.({ type: 'delete', path: '/notes/a.org' });

  expect(searchState.removeFile).toHaveBeenCalledTimes(1);
  expect(searchState.removeFile).toHaveBeenCalledWith({ path: ['notes', 'a.org'] });
});

test('file-index watcher ignores non-org file deletions without scanning the repo', async () => {
  mockIndexedFiles.push({ id: '/notes/a.org', filePath: ['notes', 'a.org'], title: 'a' });

  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();

  await watchedCallback?.({ type: 'delete', path: '/assets/image.png' });

  expect(searchState.removeFile).not.toHaveBeenCalled();
});

test('file-index watcher removes all notes under a deleted folder', async () => {
  mockIndexedFiles.push(
    { id: '/folder/a.org', filePath: ['folder', 'a.org'], title: 'a' },
    { id: '/folder/sub/b.org', filePath: ['folder', 'sub', 'b.org'], title: 'b' },
    { id: '/other/keep.org', filePath: ['other', 'keep.org'], title: 'keep' },
  );

  await fileIndexBoot({ store: {} } as never);
  await Promise.resolve();

  await watchedCallback?.({ type: 'delete', path: '/folder' });

  expect(searchState.removeFile).toHaveBeenCalledWith({ id: '/folder/a.org' });
  expect(searchState.removeFile).toHaveBeenCalledWith({ id: '/folder/sub/b.org' });
  expect(searchState.removeFile).not.toHaveBeenCalledWith({ id: '/other/keep.org' });
});
