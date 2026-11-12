import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNoteSearchCompletion } from './note-search-completion';
import type { OrgNoteApi, FileMeta, CompletionSearchResult, CompletionConfig } from 'orgnote-api';
import { ref } from 'vue';

const mockFiles: FileMeta[] = [];
let mockSearchResult: { files: FileMeta[]; total: number; query: string } | null = null;
let capturedCompletionConfig: CompletionConfig<FileMeta> | null = null;
let showDetails = true;

const createMockApi = (): OrgNoteApi => {
  const mockCompletion = {
    open: vi.fn(async (config) => {
      capturedCompletionConfig = config;
    }),
    close: vi.fn(),
  };

  const mockFileSearch = {
    search: vi.fn(async (query: string, options?: { limit?: number; offset?: number }) => {
      const filtered = mockFiles.filter(
        (f) =>
          f.title?.toLowerCase().includes(query.toLowerCase()) ||
          f.description?.toLowerCase().includes(query.toLowerCase()) ||
          f.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase())),
      );
      mockSearchResult = {
        files: filtered.slice(
          options?.offset ?? 0,
          (options?.offset ?? 0) + (options?.limit ?? 20),
        ),
        total: filtered.length,
        query,
      };
      return mockSearchResult.files;
    }),
    lastSearchResult: ref(mockSearchResult),
  };

  const mockFileMeta = {
    getAll: vi.fn(async (options?: { limit?: number; offset?: number }) => {
      return mockFiles.slice(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20));
    }),
    count: vi.fn(async () => mockFiles.length),
  };

  const mockBufferViewer = {
    open: vi.fn(),
  };

  const mockConfig = {
    config: {
      completion: {
        showDetails,
      },
    },
  };

  return {
    core: {
      useCompletion: vi.fn(() => mockCompletion),
      useFileSearch: vi.fn(() => mockFileSearch),
      useFileMeta: vi.fn(() => mockFileMeta),
      useBufferViewer: vi.fn(() => mockBufferViewer),
      useConfig: vi.fn(() => mockConfig),
    },
  } as unknown as OrgNoteApi;
};

beforeEach(() => {
  mockFiles.length = 0;
  mockSearchResult = null;
  capturedCompletionConfig = null;
  showDetails = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

test('useNoteSearchCompletion opens completion modal', async () => {
  const api = createMockApi();

  await useNoteSearchCompletion(api);

  expect(api.core.useCompletion().open).toHaveBeenCalled();
});

test('useNoteSearchCompletion opens with choice type', async () => {
  const api = createMockApi();

  await useNoteSearchCompletion(api);

  expect(capturedCompletionConfig?.type).toBe('choice');
});

test('useNoteSearchCompletion sets search placeholder', async () => {
  const api = createMockApi();

  await useNoteSearchCompletion(api);

  expect(capturedCompletionConfig?.placeholder).toBeDefined();
});

test('useNoteSearchCompletion uses detailed renderer when enabled', async () => {
  const api = createMockApi();

  await useNoteSearchCompletion(api);

  expect(capturedCompletionConfig?.itemRenderer).toBeDefined();
  expect(capturedCompletionConfig?.itemHeight).toBe(96);
});

test('useNoteSearchCompletion falls back to title-only view when disabled', async () => {
  showDetails = false;
  const api = createMockApi();

  await useNoteSearchCompletion(api);

  expect(capturedCompletionConfig?.itemRenderer).toBeUndefined();
  expect(capturedCompletionConfig?.itemHeight).toBeUndefined();
});

test('useNoteSearchCompletion does not provide candidate description when details disabled', async () => {
  showDetails = false;
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    description: 'Detailed text',
    tags: ['tag1'],
  });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;
  expect(result.result[0]!.description).toBeUndefined();
});

test('itemsGetter returns recent files for empty query', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['recent1.org'], title: 'Recent 1' },
    { id: '2', filePath: ['recent2.org'], title: 'Recent 2' },
  );

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(2);
  expect(result.total).toBe(2);
});

test('itemsGetter searches files with non-empty query', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['meeting.org'], title: 'Meeting Notes' },
    { id: '2', filePath: ['todo.org'], title: 'Todo List' },
  );

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'Meeting',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
  expect(result.result[0]!.title).toBe('Meeting Notes');
});

test('itemsGetter respects limit parameter', async () => {
  const api = createMockApi();

  for (let i = 0; i < 10; i++) {
    mockFiles.push({ id: `${i}`, filePath: [`note${i}.org`], title: `Note ${i}` });
  }

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    5,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(5);
});

test('itemsGetter respects offset parameter', async () => {
  const api = createMockApi();

  for (let i = 0; i < 10; i++) {
    mockFiles.push({ id: `${i}`, filePath: [`note${i}.org`], title: `Note ${i}` });
  }

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    5,
    3,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(5);
  expect((result.result[0]!.data as FileMeta)?.id).toBe('3');
});

test('candidate has correct icon', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['test.org'], title: 'Test' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.icon).toBe('sym_o_description');
});

test('candidate uses title from file', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['test.org'], title: 'My Title' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.title).toBe('My Title');
});

test('candidate uses filename when no title', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['folder', 'untitled.org'], title: undefined });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.title).toBe('untitled.org');
});

test('candidate description includes file description', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    description: 'This is a description',
  });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toContain('This is a description');
});

test('candidate description includes tags', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    tags: ['work', 'important'],
  });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toContain('#work');
  expect(result.result[0]!.description).toContain('#important');
});

test('candidate commandHandler opens buffer', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['folder', 'test.org'], title: 'Test' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;
  result.result[0]!.commandHandler(api);

  expect(api.core.useBufferViewer().open).toHaveBeenCalledWith('/folder/test.org');
});

test('candidate commandHandler closes completion', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['test.org'], title: 'Test' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;
  result.result[0]!.commandHandler(api);

  expect(api.core.useCompletion().close).toHaveBeenCalled();
});

test('candidate contains original file data', async () => {
  const api = createMockApi();

  const file: FileMeta = {
    id: 'data-id',
    filePath: ['data.org'],
    title: 'Data File',
    tags: ['test'],
  };
  mockFiles.push(file);

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.data).toEqual(file);
});

test('search returns total from lastSearchResult', async () => {
  const api = createMockApi();

  for (let i = 0; i < 100; i++) {
    mockFiles.push({ id: `${i}`, filePath: [`meeting${i}.org`], title: `Meeting ${i}` });
  }

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'Meeting',
    10,
    0,
  )) as CompletionSearchResult;

  expect(result.total).toBeGreaterThan(0);
});

test('empty query returns real total from count for virtual scroll', async () => {
  const api = createMockApi();

  for (let i = 0; i < 50; i++) {
    mockFiles.push({ id: `${i}`, filePath: [`note${i}.org`], title: `Note ${i}` });
  }

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    10,
    0,
  )) as CompletionSearchResult;

  // total = real count so virtual scroll knows scrollbar size for 50 files
  expect(result.total).toBe(50);
  expect(result.result).toHaveLength(10);
});

test('whitespace-only query returns recent files', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['recent.org'], title: 'Recent' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '   ',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
});

test('search by tags returns matching files', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['work.org'], title: 'Work', tags: ['work'] },
    { id: '2', filePath: ['personal.org'], title: 'Personal', tags: ['personal'] },
  );

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'work',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
  expect((result.result[0]!.data as FileMeta)?.tags).toContain('work');
});

test('candidate description handles missing description and tags', async () => {
  const api = createMockApi();

  mockFiles.push({ id: '1', filePath: ['minimal.org'], title: 'Minimal' });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('');
});

test('candidate description combines description and tags', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['combined.org'],
    title: 'Combined',
    description: 'A description',
    tags: ['tag1'],
  });

  await useNoteSearchCompletion(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toContain('A description');
  expect(result.result[0]!.description).toContain('#tag1');
});

test('getRecentFiles fetches items and count in parallel', async () => {
  const api = createMockApi();

  const getAllMock = vi.fn(
    async () =>
      [
        { id: '1', filePath: ['a.org'], title: 'A' },
        { id: '2', filePath: ['b.org'], title: 'B' },
      ] as FileMeta[],
  );
  const countMock = vi.fn(async () => 99);

  (api.core as Record<string, unknown>).useFileMeta = vi.fn(() => ({
    getAll: getAllMock,
    count: countMock,
  }));

  await useNoteSearchCompletion(api);
  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    10,
    0,
  )) as CompletionSearchResult;

  expect(getAllMock).toHaveBeenCalled();
  expect(countMock).toHaveBeenCalled();
  // total = real count from count(), not from items.length
  expect(result.total).toBe(99);
  expect(result.result).toHaveLength(2);
});

test('getRecentFiles calls count in parallel with getAll', async () => {
  const api = createMockApi();
  const callOrder: string[] = [];

  const getAllMock = vi.fn(async () => {
    callOrder.push('getAll-start');
    await new Promise((r) => setTimeout(r, 10));
    callOrder.push('getAll-end');
    return [{ id: '1', filePath: ['a.org'], title: 'A' }] as FileMeta[];
  });
  const countMock = vi.fn(async () => {
    callOrder.push('count-start');
    return 42;
  });

  (api.core as Record<string, unknown>).useFileMeta = vi.fn(() => ({
    getAll: getAllMock,
    count: countMock,
  }));

  await useNoteSearchCompletion(api);
  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    10,
    0,
  )) as CompletionSearchResult;

  expect(countMock).toHaveBeenCalled();
  // count started before getAll finished → parallel execution
  expect(callOrder.indexOf('count-start')).toBeLessThan(callOrder.indexOf('getAll-end'));
  // total comes from count()
  expect(result.total).toBe(42);
});
