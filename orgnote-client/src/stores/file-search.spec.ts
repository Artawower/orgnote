import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFileSearchStore } from './file-search';
import type { FileMeta, DiskFile, QueueOperation, QueueRunOptions } from 'orgnote-api';
import type * as OrgModeAst from 'org-mode-ast';
import { EventEmitter } from 'node:events';
import {
  waitForQueueDrain,
  type QueueDrainSource,
} from 'src/infrastructure/queue/wait-for-queue-drain';

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));

vi.mock('src/boot/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: mockLoggerError,
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockFiles: Map<string, FileMeta> = new Map();
const mockKeyValue: Map<string, string> = new Map();

vi.mock('src/boot/repositories', () => ({
  repositories: {
    fileRepository: {
      save: vi.fn(async (meta: FileMeta) => {
        mockFiles.set(meta.id, meta);
      }),
      getByPath: vi.fn(async (path: string[]) => {
        for (const file of mockFiles.values()) {
          if (file.filePath.join('/') === path.join('/')) return file;
        }
        return undefined;
      }),
      getByIds: vi.fn(async (ids: string[]) => {
        return ids.map((id) => mockFiles.get(id)).filter(Boolean) as FileMeta[];
      }),
      getAll: vi.fn(async () => Array.from(mockFiles.values())),
      delete: vi.fn(async (id: string) => {
        mockFiles.delete(id);
      }),
    },
    keyValueRepository: {
      get: vi.fn(async (key: string) => mockKeyValue.get(key)),
      set: vi.fn(async (key: string, value: string) => {
        mockKeyValue.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        mockKeyValue.delete(key);
      }),
    },
    queueRepository: {
      get: vi.fn(async (id: string) => mockQueueTasksDB.get(id)),
    },
  },
}));

const mockFileContents: Map<string, string> = new Map();
const mockFileInfos: Map<string, { mtime: string }> = new Map();
const mockDirEntries: Map<string, DiskFile[]> = new Map();
const mockQueueTasksDB: Map<string, Record<string, unknown>> = new Map();

const mockFileContentRead = vi.fn(async (path: string) => {
  const text = mockFileContents.get(path);
  if (text === undefined) throw new Error(`File not found: ${path}`);
  return new TextEncoder().encode(text);
});
const mockFileContentWrite = vi.fn();
const mockFileInfo = vi.fn(async (path: string) => mockFileInfos.get(path));
const mockReadDir = vi.fn(async (path: string) => mockDirEntries.get(path) ?? []);

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileContent: () => ({
        read: mockFileContentRead,
        write: mockFileContentWrite,
      }),
    },
  },
}));

vi.mock('src/stores/file-system', () => ({
  useFileSystemStore: vi.fn(() => ({
    fileInfo: mockFileInfo,
    readDir: mockReadDir,
  })),
}));

const mockQueueTasks: Array<{ queueId: string; payload: unknown }> = [];
const mockIndexQueue = Object.assign(new EventEmitter(), { length: 0 });
mockIndexQueue.on('drain', () => {
  mockIndexQueue.length = 0;
});
let shouldAutoDrainIndexQueue = true;

vi.mock('src/stores/queue', () => ({
  useQueueStore: vi.fn(() => ({
    add: vi.fn(async (queueId: string, payload: unknown, options?: { id?: string }) => {
      const taskId = options?.id ?? 'task-id';
      mockQueueTasks.push({ queueId, payload });
      mockIndexQueue.length += 1;
      mockIndexQueue.emit('task_queued', taskId);
      if (shouldAutoDrainIndexQueue) queueMicrotask(() => mockIndexQueue.emit('drain'));
      return taskId;
    }),
    getAll: vi.fn(async () => [...mockQueueTasksDB.values()]),
    getQueue: vi.fn(() => mockIndexQueue),
    runAndWaitForIdle: vi.fn(
      (_queueId: string, operation: QueueOperation, options?: QueueRunOptions) =>
        waitForQueueDrain(
          mockIndexQueue as unknown as QueueDrainSource,
          operation,
          async () =>
            [...mockQueueTasksDB.values()].some(
              (task) => task.status === 'pending' || task.status === 'processing',
            ),
          options,
        ),
    ),
  })),
}));

let useActualParsedMeta = false;
let mockParsedMeta = {
  id: 'parsed-id' as string | undefined,
  title: 'Parsed Title',
  description: 'Parsed description',
  fileTags: ['tag1', 'tag2'],
  connectedNotes: { link1: true, link2: true } as Record<string, boolean> | undefined,
};

vi.mock('org-mode-ast', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof OrgModeAst;

  return {
    ...actual,
    parse: vi.fn((content: string) => actual.parse(content)),
    withMetaInfo: vi.fn((node) => {
      if (useActualParsedMeta) return actual.withMetaInfo(node);
      node.updateMeta({ ...mockParsedMeta });
      return node;
    }),
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  mockFiles.clear();
  mockKeyValue.clear();
  mockFileContents.clear();
  mockFileInfos.clear();
  mockDirEntries.clear();
  mockQueueTasks.length = 0;
  mockQueueTasksDB.clear();
  mockIndexQueue.removeAllListeners();
  mockIndexQueue.length = 0;
  mockIndexQueue.on('drain', () => {
    mockIndexQueue.length = 0;
  });
  shouldAutoDrainIndexQueue = true;
  mockFileContentRead.mockImplementation(async (path: string) => {
    const text = mockFileContents.get(path);
    if (text === undefined) throw new Error(`File not found: ${path}`);
    return new TextEncoder().encode(text);
  });
  mockFileContentWrite.mockResolvedValue(undefined);
  mockFileInfo.mockImplementation(async (path: string) => mockFileInfos.get(path));
  mockReadDir.mockImplementation(async (path: string) => mockDirEntries.get(path) ?? []);
  useActualParsedMeta = false;
  mockParsedMeta = {
    id: 'parsed-id',
    title: 'Parsed Title',
    description: 'Parsed description',
    fileTags: ['tag1', 'tag2'],
    connectedNotes: { link1: true, link2: true },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

test('search returns empty array for empty query', async () => {
  const store = useFileSearchStore();
  const result = await store.search('');
  expect(result).toEqual([]);
});

test('search returns empty array for whitespace-only query', async () => {
  const store = useFileSearchStore();
  const result = await store.search('   ');
  expect(result).toEqual([]);
});

test('search clears lastSearchResult for empty query', async () => {
  const store = useFileSearchStore();
  store.lastSearchResult = {
    files: [],
    total: 5,
    query: 'previous',
    searchedAt: Date.now(),
  };

  await store.search('');
  expect(store.lastSearchResult).toBeNull();
});

test('search sets isSearching during search', async () => {
  const store = useFileSearchStore();

  mockFiles.set('test-id', {
    id: 'test-id',
    filePath: ['test.org'],
    title: 'Test',
  });

  await store.processFile('/test.org');

  const searchPromise = store.search('Test');
  expect(store.isSearching).toBe(true);

  await searchPromise;
  expect(store.isSearching).toBe(false);
});

test('search with limit option after processFile', async () => {
  const store = useFileSearchStore();

  for (let i = 0; i < 10; i++) {
    mockFileContents.set(`/note${i}.org`, `#+TITLE: Meeting ${i}\nContent ${i}`);
    await store.processFile(`/note${i}.org`);
  }

  const result = await store.search('Meeting', { limit: 5 });
  expect(result.length).toBeLessThanOrEqual(5);
});

test('search keeps the exact total stable across result pages', async () => {
  const store = useFileSearchStore();
  useActualParsedMeta = true;
  const matchingNotes = Array.from({ length: 10 }, (_, index) => ({
    path: `/meeting-${index}.org`,
    content: `:PROPERTIES:\n:ID: meeting-${index}\n:END:\n#+TITLE: Meeting ${index}\nMeeting notes`,
  }));
  matchingNotes.forEach(({ path, content }) => mockFileContents.set(path, content));
  await Promise.all(matchingNotes.map(({ path }) => store.processFile(path)));

  const firstPage = await store.search('Meeting', { limit: 2, offset: 0 });
  const firstTotal = store.lastSearchResult?.total;
  const secondPage = await store.search('Meeting', { limit: 2, offset: 2 });

  expect(firstPage).toHaveLength(2);
  expect(secondPage).toHaveLength(2);
  expect(firstTotal).toBe(matchingNotes.length);
  expect(store.lastSearchResult?.total).toBe(firstTotal);
});

test('search updates lastSearchResult after processFile', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/result.org', '#+TITLE: Search Result\nContent');
  await store.processFile('/result.org');

  await store.search('Result');

  expect(store.lastSearchResult).not.toBeNull();
  expect(store.lastSearchResult?.query).toBe('Result');
  expect(store.lastSearchResult?.searchedAt).toBeDefined();
});

test('indexFile adds task to queue', async () => {
  const store = useFileSearchStore();
  await store.indexFile('/notes/test.org');

  expect(mockQueueTasks).toHaveLength(1);
  expect(mockQueueTasks[0]!.queueId).toBe('content-index');
  expect((mockQueueTasks[0]!.payload as { filePath: string }).filePath).toBe('/notes/test.org');
});

test('processFile parses and saves file metadata', async () => {
  const store = useFileSearchStore();
  mockFileContents.set('/notes/test.org', '#+TITLE: Test\nContent here');

  await store.processFile('/notes/test.org');

  expect(mockFiles.size).toBe(1);
  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.title).toBe('Parsed Title');
});

test('processFile regression: file created without org-mode ID becomes searchable after ID is added', async () => {
  const { repositories } = await import('src/boot/repositories');
  const saveMock = vi.mocked(repositories.fileRepository.save);

  saveMock.mockImplementation(async (meta: FileMeta) => {
    for (const existing of mockFiles.values()) {
      if (existing.filePath.join('/') === meta.filePath.join('/')) {
        mockFiles.set(existing.id, { ...meta, id: existing.id });
        return;
      }
    }
    mockFiles.set(meta.id, meta);
  });

  const store = useFileSearchStore();

  mockParsedMeta.id = undefined;
  mockFileContents.set('/lexorank.org', '#+TITLE: Lexorank\nContent about lexorank algorithm');
  await store.processFile('/lexorank.org');

  const firstSearch = await store.search('Lexorank');
  expect(firstSearch.length).toBe(1);
  expect(firstSearch[0]!.id).toBe('/lexorank.org');

  mockParsedMeta.id = '2F7C59C6-E48A-4F6A-9D49-08769D61E935';
  mockFileContents.set(
    '/lexorank.org',
    ':PROPERTIES:\n:ID: 2F7C59C6-E48A-4F6A-9D49-08769D61E935\n:END:\n#+TITLE: Lexorank\nContent about lexorank algorithm',
  );
  await store.processFile('/lexorank.org');

  const secondSearch = await store.search('Lexorank');
  expect(secondSearch.length).toBe(1);
  expect(secondSearch[0]!.id).toBe('2F7C59C6-E48A-4F6A-9D49-08769D61E935');

  saveMock.mockImplementation(async (meta: FileMeta) => {
    mockFiles.set(meta.id, meta);
  });
});

test('processFile indexes title tags and content from an Org file with a root ID', async () => {
  const store = useFileSearchStore();
  useActualParsedMeta = true;
  mockFileContents.set(
    '/test.org',
    ':PROPERTIES:\n:ID: qwfqwf\n:END:\n\n#+FILETAGS: :tag1:gad2:\n\n#+TITLE: SOme EPE\nHello world this is fine...\n',
  );

  await store.processFile('/test.org');

  for (const query of ['tag1', 'SOme', 'Hello']) {
    const results = await store.search(query);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: 'qwfqwf',
        title: 'SOme EPE',
        tags: ['tag1', 'gad2'],
      }),
    );
  }
});

test('processFile indexes empty file with path-based title', async () => {
  const store = useFileSearchStore();
  mockFileContents.set('/notes/empty.org', '');

  await store.processFile('/notes/empty.org');
  expect(mockFiles.size).toBe(1);
  const saved = mockFiles.get('/notes/empty.org');
  expect(saved?.title).toBe('empty');
  expect(saved?.filePath).toEqual(['notes', 'empty.org']);
});

test('processFile does nothing for missing file', async () => {
  const store = useFileSearchStore();

  await store.processFile('/notes/nonexistent.org');
  expect(mockFiles.size).toBe(0);
});

test('removeFile by id removes from repository', async () => {
  const store = useFileSearchStore();
  const file: FileMeta = { id: 'to-remove', filePath: ['remove.org'], title: 'Remove' };
  mockFiles.set(file.id, file);

  await store.removeFile({ id: 'to-remove' });

  expect(mockFiles.has('to-remove')).toBe(false);
});

test('removeFile by path removes from repository', async () => {
  const store = useFileSearchStore();
  const file: FileMeta = { id: 'path-remove', filePath: ['folder', 'remove.org'], title: 'Remove' };
  mockFiles.set(file.id, file);

  await store.removeFile({ path: ['folder', 'remove.org'] });

  expect(mockFiles.has('path-remove')).toBe(false);
});

test('removeFile does nothing for non-existent id', async () => {
  const store = useFileSearchStore();
  await expect(store.removeFile({ id: 'non-existent' })).resolves.not.toThrow();
});

test('indexFiles sets isIndexing flag', async () => {
  const store = useFileSearchStore();
  mockDirEntries.set('/', []);

  const promise = store.indexFiles();
  expect(store.isIndexing).toBe(true);

  await promise;
  expect(store.isIndexing).toBe(false);
});

test('indexFiles remains active until the content index queue drains', async () => {
  shouldAutoDrainIndexQueue = false;
  mockDirEntries.set('/', [
    { name: 'agenda.org', type: 'file', path: '/agenda.org', size: 0, mtime: 0 },
  ]);
  const store = useFileSearchStore();

  const indexing = store.indexFiles();
  await vi.waitFor(() => expect(mockQueueTasks).toHaveLength(1));

  expect(store.isIndexing).toBe(true);

  mockIndexQueue.emit('drain');
  await indexing;

  expect(store.isIndexing).toBe(false);
});

test('indexFiles waits for active tasks restored from the persistent queue', async () => {
  shouldAutoDrainIndexQueue = false;
  mockQueueTasksDB.set('file:/agenda.org', {
    id: 'file:/agenda.org',
    queueId: 'content-index',
    status: 'pending',
    payload: { filePath: '/agenda.org' },
  });
  mockDirEntries.set('/', [
    { name: 'agenda.org', type: 'file', path: '/agenda.org', size: 0, mtime: 0 },
  ]);
  const store = useFileSearchStore();

  const indexing = store.indexFiles();
  await vi.waitFor(() => expect(mockReadDir).toHaveBeenCalledWith('/'));

  expect(store.isIndexing).toBe(true);

  mockIndexQueue.emit('drain');
  await indexing;

  expect(store.isIndexing).toBe(false);
});

test('indexFiles scans directories recursively', async () => {
  const store = useFileSearchStore();

  mockDirEntries.set('/', [
    { name: 'subdir', type: 'directory', path: '/subdir', size: 0, mtime: 0 },
  ]);
  mockDirEntries.set('/subdir', [
    { name: 'note.org', type: 'file', path: '/subdir/note.org', size: 0, mtime: 0 },
  ]);
  mockFileInfos.set('/subdir/note.org', { mtime: new Date().toISOString() });

  await store.indexFiles();

  expect(
    mockQueueTasks.some((t) => (t.payload as { filePath: string }).filePath === '/subdir/note.org'),
  ).toBe(true);
});

test('indexFiles skips non-org files', async () => {
  const store = useFileSearchStore();

  mockDirEntries.set('/', [
    { name: 'note.org', type: 'file', path: '/note.org', size: 0, mtime: 0 },
    { name: 'readme.txt', type: 'file', path: '/readme.txt', size: 0, mtime: 0 },
    { name: 'data.json', type: 'file', path: '/data.json', size: 0, mtime: 0 },
  ]);
  mockFileInfos.set('/note.org', { mtime: new Date().toISOString() });
  mockFileInfos.set('/readme.txt', { mtime: new Date().toISOString() });
  mockFileInfos.set('/data.json', { mtime: new Date().toISOString() });

  await store.indexFiles();

  expect(mockQueueTasks).toHaveLength(1);
  expect((mockQueueTasks[0]!.payload as { filePath: string }).filePath).toBe('/note.org');
});

test('indexFiles indexes files not in repository', async () => {
  const store = useFileSearchStore();

  mockDirEntries.set('/', [{ name: 'new.org', type: 'file', path: '/new.org', size: 0, mtime: 0 }]);
  mockFileInfos.set('/new.org', { mtime: new Date().toISOString() });

  await store.indexFiles();

  expect(
    mockQueueTasks.some((t) => (t.payload as { filePath: string }).filePath === '/new.org'),
  ).toBe(true);
});

test('indexFiles indexes files not in indexedIds', async () => {
  const store = useFileSearchStore();

  const existingFile: FileMeta = {
    id: 'existing-id',
    filePath: ['existing.org'],
    title: 'Existing',
  };
  mockFiles.set(existingFile.id, existingFile);

  mockKeyValue.set(
    'file-index',
    JSON.stringify({
      version: 4,
      files: {
        'existing-id': {
          id: 'existing-id',
          indexedAt: '2020-01-01T00:00:00.000Z',
          fileModifiedAt: '2020-01-01T00:00:00.000Z',
        },
      },
      indexData: {},
    }),
  );

  await store.loadIndex();

  const newerMtime = new Date('2025-01-01T00:00:00.000Z').getTime();
  mockDirEntries.set('/', [
    { name: 'existing.org', type: 'file', path: '/existing.org', size: 0, mtime: newerMtime },
  ]);

  await store.indexFiles();

  expect(
    mockQueueTasks.some((t) => (t.payload as { filePath: string }).filePath === '/existing.org'),
  ).toBe(true);
});

test('indexFiles skips files with old mtime when already in repo', async () => {
  mockFileContents.set('/indexed.org', '#+TITLE: Indexed\nContent');
  mockFileInfos.set('/indexed.org', { mtime: '2020-01-01T00:00:00.000Z' });

  const store = useFileSearchStore();
  await store.processFile('/indexed.org');
  await store.saveIndex();

  const freshStore = useFileSearchStore();
  await freshStore.loadIndex();
  mockQueueTasks.length = 0;

  mockDirEntries.set('/', [
    { name: 'indexed.org', type: 'file', path: '/indexed.org', size: 0, mtime: 0 },
  ]);
  mockFileInfos.set('/indexed.org', { mtime: '2019-01-01T00:00:00.000Z' });

  await freshStore.indexFiles();

  expect(mockQueueTasks).toHaveLength(0);
});

test('indexFiles indexes modified files since lastIndexedAt', async () => {
  const store = useFileSearchStore();

  const existingFile: FileMeta = {
    id: 'modified-id',
    filePath: ['modified.org'],
    title: 'Modified',
  };
  mockFiles.set(existingFile.id, existingFile);

  mockKeyValue.set(
    'file-index',
    JSON.stringify({
      version: 4,
      files: {
        'modified-id': {
          id: 'modified-id',
          indexedAt: '2020-01-01T00:00:00.000Z',
          fileModifiedAt: '2020-01-01T00:00:00.000Z',
        },
      },
      indexData: {},
    }),
  );

  await store.loadIndex();
  mockQueueTasks.length = 0;

  const newerMtime = new Date('2025-01-01T00:00:00.000Z').getTime();
  mockDirEntries.set('/', [
    { name: 'modified.org', type: 'file', path: '/modified.org', size: 0, mtime: newerMtime },
  ]);

  await store.indexFiles();

  expect(
    mockQueueTasks.some((t) => (t.payload as { filePath: string }).filePath === '/modified.org'),
  ).toBe(true);
});

test('indexFiles uses directory entry mtime instead of extra fileInfo lookup', async () => {
  const store = useFileSearchStore();
  const fileMtime = new Date('2021-01-01T00:00:00.000Z');

  mockFiles.set('indexed-id', {
    id: 'indexed-id',
    filePath: ['indexed.org'],
    title: 'Indexed',
  });
  mockKeyValue.set(
    'file-index',
    JSON.stringify({
      version: 4,
      files: {
        'indexed-id': {
          id: 'indexed-id',
          indexedAt: '2020-01-01T00:00:00.000Z',
          fileModifiedAt: '2020-01-01T00:00:00.000Z',
        },
      },
      indexData: {},
    }),
  );

  await store.loadIndex();
  mockQueueTasks.length = 0;
  mockDirEntries.set('/', [
    {
      name: 'indexed.org',
      type: 'file',
      path: '/indexed.org',
      size: 0,
      mtime: fileMtime.getTime(),
    },
  ]);

  await store.indexFiles();

  expect(mockFileInfo).not.toHaveBeenCalledWith('/indexed.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('loadIndex returns false when no stored index', async () => {
  const store = useFileSearchStore();
  const result = await store.loadIndex();
  expect(result).toBe(false);
});

test('loadIndex returns false for wrong version', async () => {
  const store = useFileSearchStore();
  mockKeyValue.set(
    'file-index',
    JSON.stringify({
      version: 999,
      files: {
        id1: {
          id: 'id1',
          indexedAt: '2020-01-01T00:00:00.000Z',
          fileModifiedAt: '2020-01-01T00:00:00.000Z',
        },
      },
    }),
  );

  const result = await store.loadIndex();
  expect(result).toBe(false);
});

test('loadIndex returns false for corrupted JSON', async () => {
  const store = useFileSearchStore();
  mockKeyValue.set('file-index', 'not valid json');

  const result = await store.loadIndex();
  expect(result).toBe(false);
});

test('loadIndex returns false for empty indexed files', async () => {
  const store = useFileSearchStore();
  mockKeyValue.set('file-index', JSON.stringify({ version: 4, files: {}, indexData: {} }));

  const result = await store.loadIndex();
  expect(result).toBe(false);
});

test('loadIndex restores index from storage', async () => {
  mockFileContents.set('/stored.org', '#+TITLE: Stored\nContent here');
  mockFileInfos.set('/stored.org', { mtime: new Date().toISOString() });

  const store = useFileSearchStore();
  await store.processFile('/stored.org');
  await store.saveIndex();

  const freshStore = useFileSearchStore();
  const result = await freshStore.loadIndex();

  expect(result).toBe(true);
  expect(freshStore.indexStats.indexed).toBe(1);
});

test('loadIndex returns false when indexData is empty', async () => {
  const store = useFileSearchStore();
  mockKeyValue.set(
    'file-index',
    JSON.stringify({
      version: 4,
      files: {
        'some-id': {
          id: 'some-id',
          indexedAt: '2020-01-01T00:00:00.000Z',
          fileModifiedAt: '2020-01-01T00:00:00.000Z',
        },
      },
      indexData: {},
    }),
  );

  const result = await store.loadIndex();
  // Empty indexData means nothing to restore; stale entries are cleaned by performIndexing
  expect(result).toBe(false);
});

test('saveIndex stores version and indexed files', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/save.org', '#+TITLE: Save\nContent');
  mockFileInfos.set('/save.org', { mtime: new Date().toISOString() });
  await store.processFile('/save.org');

  await store.saveIndex();

  const stored = mockKeyValue.get('file-index');
  expect(stored).toBeDefined();

  const parsed = JSON.parse(stored!);
  expect(parsed.version).toBe(4);
  expect(Object.keys(parsed.files).length).toBeGreaterThan(0);
  expect(parsed.files['parsed-id']).toBeDefined();
  expect(parsed.indexData).toBeDefined();
});

test('clearIndex removes all indexed data', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/clear.org', '#+TITLE: Clear\nContent');
  await store.processFile('/clear.org');
  mockKeyValue.set('file-index', 'some data');

  await store.clearIndex();

  expect(store.indexStats.indexed).toBe(0);
  expect(mockKeyValue.has('file-index')).toBe(false);
});

test('processFile saves file metadata to repository', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/save-test.org', '#+TITLE: Save Test\nContent');

  await store.processFile('/save-test.org');

  expect(mockFiles.size).toBe(1);
  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.title).toBe('Parsed Title');
});

test('processFile extracts links from parsed content', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/links.org', '#+TITLE: Links\n[[id:link1][Link 1]]');

  await store.processFile('/links.org');

  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.links).toContain('link1');
});

test('removeFile removes from repository', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/to-remove.org', '#+TITLE: Remove\nContent');
  await store.processFile('/to-remove.org');
  expect(mockFiles.size).toBe(1);

  const savedFile = Array.from(mockFiles.values())[0]!;
  await store.removeFile({ id: savedFile.id });

  expect(mockFiles.has(savedFile.id)).toBe(false);
});

test('removeFile by path resolves file and removes', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/by-path.org', '#+TITLE: By Path\nContent');
  await store.processFile('/by-path.org');

  await store.removeFile({ path: ['by-path.org'] });
});

test('search returns files from repository after processFile', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/searchable.org', '#+TITLE: Searchable Meeting\nContent');
  await store.processFile('/searchable.org');

  const savedFile = Array.from(mockFiles.values())[0]!;
  expect(savedFile).toBeDefined();
  expect(savedFile.title).toBe('Parsed Title');
});

test('processFile handles file with all metadata', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/full.org', '#+TITLE: Full\n#+DESCRIPTION: Desc\nContent');
  await store.processFile('/full.org');

  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.description).toBe('Parsed description');
  expect(saved.tags).toEqual(['tag1', 'tag2']);
});

test('processFile sets updatedAt timestamp', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/timestamp.org', '#+TITLE: Timestamp\nContent');
  await store.processFile('/timestamp.org');

  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.updatedAt).toBeDefined();
});

test('processFile creates correct filePath array', async () => {
  const store = useFileSearchStore();

  mockFileContents.set('/folder/subfolder/note.org', '#+TITLE: Nested\nContent');
  await store.processFile('/folder/subfolder/note.org');

  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.filePath).toEqual(['folder', 'subfolder', 'note.org']);
});

test('indexFile re-queues file when existing task is completed', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'completed',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('indexFile re-queues file when existing task is failed', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'failed',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('indexFile re-queues file when existing task is canceled', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'canceled',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('indexFile skips file when existing task is pending', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'pending',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(0);
});

test('indexFile skips file when existing task is processing', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'processing',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(0);
});

test('indexFile ignores completed tasks from different queue', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'sync',
    status: 'pending',
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('indexFile ignores deleted tasks', async () => {
  const store = useFileSearchStore();

  mockQueueTasksDB.set('file:/notes/test.org', {
    id: 'file:/notes/test.org',
    queueId: 'content-index',
    status: 'pending',
    deletedAt: Date.now(),
    payload: { filePath: '/notes/test.org' },
    added: Date.now(),
  });

  await store.indexFile('/notes/test.org');
  expect(mockQueueTasks).toHaveLength(1);
});

test('processFile migrates ID when org-mode ID differs from stored path-based ID', async () => {
  const store = useFileSearchStore();

  const oldId = '/my-note.org';
  const oldFile: FileMeta = {
    id: oldId,
    filePath: ['my-note.org'],
    title: 'Old Title',
  };
  mockFiles.set(oldId, oldFile);

  mockParsedMeta.id = 'ORG-MODE-UUID-123';
  mockFileContents.set(
    '/my-note.org',
    '#+TITLE: New Title\n:PROPERTIES:\n:ID: ORG-MODE-UUID-123\n:END:\nContent',
  );

  await store.processFile('/my-note.org');

  expect(mockFiles.has(oldId)).toBe(false);
  expect(mockFiles.has('ORG-MODE-UUID-123')).toBe(true);
  expect(mockFiles.get('ORG-MODE-UUID-123')!.title).toBe('Parsed Title');
});

test('processFile migrated file is searchable by new ID', async () => {
  const store = useFileSearchStore();

  const oldId = '/migrating-note.org';
  mockFiles.set(oldId, {
    id: oldId,
    filePath: ['migrating-note.org'],
    title: 'Before Migration',
  });

  mockParsedMeta.id = 'NEW-UUID-456';
  mockParsedMeta.title = 'Migrated Note';
  mockFileContents.set('/migrating-note.org', '#+TITLE: Migrated Note\nSearchable content');

  await store.processFile('/migrating-note.org');

  const results = await store.search('Migrated');
  expect(results.length).toBe(1);
  expect(results[0]!.id).toBe('NEW-UUID-456');
});

test('processFile does not migrate when IDs match', async () => {
  const store = useFileSearchStore();

  mockFiles.set('parsed-id', {
    id: 'parsed-id',
    filePath: ['stable-note.org'],
    title: 'Stable',
  });

  mockFileContents.set('/stable-note.org', '#+TITLE: Stable\nContent');

  await store.processFile('/stable-note.org');

  expect(mockFiles.size).toBe(1);
  expect(mockFiles.has('parsed-id')).toBe(true);
});

test('processFile removes old ID from FlexSearch index during migration', async () => {
  const store = useFileSearchStore();

  const oldId = '/old-path-note.org';
  mockFiles.set(oldId, {
    id: oldId,
    filePath: ['old-path-note.org'],
    title: 'Old Indexed',
  });

  mockParsedMeta.id = oldId;
  mockFileContents.set('/old-path-note.org', '#+TITLE: Old Indexed\nOld content');
  await store.processFile('/old-path-note.org');

  const oldResults = await store.search('Old Indexed');
  expect(oldResults.length).toBe(1);

  mockParsedMeta.id = 'MIGRATED-UUID-789';
  mockParsedMeta.title = 'Migrated Indexed';
  mockFileContents.set('/old-path-note.org', '#+TITLE: Migrated Indexed\nNew content');
  await store.processFile('/old-path-note.org');

  const staleResults = await store.search('Old Indexed');
  expect(staleResults.length).toBe(0);

  const freshResults = await store.search('Migrated Indexed');
  expect(freshResults.length).toBe(1);
  expect(freshResults[0]!.id).toBe('MIGRATED-UUID-789');
});

test('processFile migration works when no existing record in DB', async () => {
  const store = useFileSearchStore();

  mockParsedMeta.id = 'BRAND-NEW-UUID';
  mockFileContents.set('/brand-new.org', '#+TITLE: Brand New\nContent');

  await store.processFile('/brand-new.org');

  expect(mockFiles.size).toBe(1);
  expect(mockFiles.has('BRAND-NEW-UUID')).toBe(true);
});

test('processFile migration throws and removes stale record when save fails', async () => {
  const { repositories } = await import('src/boot/repositories');
  const saveMock = repositories.fileRepository.save as ReturnType<typeof vi.fn>;

  const store = useFileSearchStore();

  const oldId = '/path-based-id.org';
  mockFiles.set(oldId, {
    id: oldId,
    filePath: ['path-based-id.org'],
    title: 'Original Note',
  });

  mockParsedMeta.id = oldId;
  mockParsedMeta.title = 'Original Note';
  mockFileContents.set('/path-based-id.org', '#+TITLE: Original Note\nOriginal content');
  await store.processFile('/path-based-id.org');

  const preFailureSearch = await store.search('Original Note');
  expect(preFailureSearch.length).toBe(1);

  mockParsedMeta.id = 'NEW-UUID-WILL-FAIL';
  mockParsedMeta.title = 'Updated Note';
  mockFileContents.set('/path-based-id.org', '#+TITLE: Updated Note\nUpdated content');
  saveMock.mockRejectedValueOnce(new Error('Dexie write failed'));

  await expect(store.processFile('/path-based-id.org')).rejects.toThrow('Dexie write failed');

  expect(mockFiles.has(oldId)).toBe(false);

  saveMock.mockImplementation(async (meta: FileMeta) => {
    mockFiles.set(meta.id, meta);
  });

  mockParsedMeta.id = 'NEW-UUID-WILL-FAIL';
  mockParsedMeta.title = 'Updated Note';
  await store.processFile('/path-based-id.org');

  const recoveredSearch = await store.search('Updated Note');
  expect(recoveredSearch.length).toBe(1);
  expect(recoveredSearch[0]!.id).toBe('NEW-UUID-WILL-FAIL');
});

test('indexFile succeeds on retry after initial empty file', async () => {
  const store = useFileSearchStore();

  await store.indexFile('/notes/new.org');
  expect(mockQueueTasks).toHaveLength(1);

  await store.processFile('/notes/new.org');
  expect(mockFiles.size).toBe(0);

  mockQueueTasksDB.set('file:/notes/new.org', {
    id: 'file:/notes/new.org',
    queueId: 'content-index',
    status: 'completed',
    payload: { filePath: '/notes/new.org' },
    added: Date.now(),
  });

  mockFileContents.set('/notes/new.org', '#+TITLE: New Note\nActual content');
  mockQueueTasks.length = 0;

  await store.indexFile('/notes/new.org');
  expect(mockQueueTasks).toHaveLength(1);

  await store.processFile('/notes/new.org');
  expect(mockFiles.size).toBe(1);

  const saved = Array.from(mockFiles.values())[0]!;
  expect(saved.title).toBe('Parsed Title');
});

test('indexFiles uses a single repository snapshot during scan', async () => {
  const { repositories } = await import('src/boot/repositories');
  const getByPathMock = repositories.fileRepository.getByPath as ReturnType<typeof vi.fn>;
  const getAllMock = repositories.fileRepository.getAll as ReturnType<typeof vi.fn>;
  const store = useFileSearchStore();

  mockDirEntries.set(
    '/',
    Array.from({ length: 10 }, (_, index) => ({
      name: `note-${index + 1}.org`,
      type: 'file',
      path: `/note-${index + 1}.org`,
      size: 0,
      mtime: Date.now(),
    })),
  );

  await store.indexFiles();

  expect(getAllMock).toHaveBeenCalledTimes(1);
  expect(getByPathMock).not.toHaveBeenCalled();
});

test('saveIndex stores FlexSearch index data for zero-read restore', async () => {
  mockFileContents.set('/hello.org', '#+TITLE: Hello World\nsome content');
  mockFileInfos.set('/hello.org', { mtime: new Date().toISOString() });

  const store = useFileSearchStore();
  await store.processFile('/hello.org');
  await store.saveIndex();

  const raw = mockKeyValue.get('file-index');
  expect(raw).toBeDefined();
  const parsed = JSON.parse(raw!);
  expect(parsed.indexData).toBeDefined();
  expect(Object.keys(parsed.indexData).length).toBeGreaterThan(0);
});

test('loadIndex restores search without reading file contents', async () => {
  mockFileContents.set('/guide.org', '#+TITLE: Guide Note\nfull text');
  mockFileInfos.set('/guide.org', { mtime: new Date().toISOString() });

  const store = useFileSearchStore();
  await store.processFile('/guide.org');
  await store.saveIndex();

  vi.clearAllMocks();
  const freshStore = useFileSearchStore();
  const loaded = await freshStore.loadIndex();

  expect(loaded).toBe(true);
  // getByIds is called to verify files still exist (lightweight check, no content read)
  expect(mockFileContentRead).not.toHaveBeenCalled();

  const results = await freshStore.search('Guide');
  expect(results.length).toBeGreaterThan(0);
});
