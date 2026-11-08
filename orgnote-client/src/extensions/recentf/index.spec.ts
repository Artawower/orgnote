import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { recentfExtension } from './index';
import type { OrgNoteApi, FileMeta, CompletionConfig, CompletionSearchResult } from 'orgnote-api';

const mockFiles: FileMeta[] = [];
let capturedCompletionConfig: CompletionConfig<FileMeta> | null = null;
let registeredCommand: { command: string; handler: (api: OrgNoteApi) => Promise<void> } | null =
  null;
let removedCommandName: string | null = null;

const createMockApi = (): OrgNoteApi => {
  const mockCompletion = {
    open: vi.fn(async (config) => {
      capturedCompletionConfig = config;
    }),
    close: vi.fn(),
  };

  const mockFileMeta = {
    getAll: vi.fn(async (options?: { limit?: number; offset?: number }) => {
      if (!options) return mockFiles;
      const start = options.offset ?? 0;
      const end = options.limit ? start + options.limit : undefined;
      return mockFiles.slice(start, end);
    }),
    count: vi.fn(async () => mockFiles.length),
  };

  const mockBufferViewer = {
    open: vi.fn(),
  };

  const mockCommands = {
    add: vi.fn((cmd) => {
      registeredCommand = cmd;
    }),
    remove: vi.fn((cmd) => {
      removedCommandName = cmd.command;
    }),
  };

  return {
    core: {
      useCompletion: vi.fn(() => mockCompletion),
      useFileMeta: vi.fn(() => mockFileMeta),
      useBufferViewer: vi.fn(() => mockBufferViewer),
      useCommands: vi.fn(() => mockCommands),
    },
  } as unknown as OrgNoteApi;
};

beforeEach(() => {
  mockFiles.length = 0;
  capturedCompletionConfig = null;
  registeredCommand = null;
  removedCommandName = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

test('recentfExtension has onMounted function', () => {
  expect(recentfExtension.onMounted).toBeDefined();
  expect(typeof recentfExtension.onMounted).toBe('function');
});

test('recentfExtension has onUnmounted function', () => {
  expect(recentfExtension.onUnmounted).toBeDefined();
  expect(typeof recentfExtension.onUnmounted).toBe('function');
});

test('recentfExtension onMounted registers command', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);

  expect(api.core.useCommands().add).toHaveBeenCalled();
  expect(registeredCommand).not.toBeNull();
});

test('recentfExtension registers command with correct name', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);

  expect(registeredCommand?.command).toBe('recent files');
});

test('recentfExtension registers command with global group', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);

  expect((registeredCommand as { group?: string })?.group).toBe('global');
});

test('recentfExtension registers command with history icon', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);

  expect((registeredCommand as { icon?: string })?.icon).toBe('sym_o_history');
});

test('recentfExtension onUnmounted removes command', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);
  await recentfExtension.onUnmounted?.(api);

  expect(api.core.useCommands().remove).toHaveBeenCalled();
  expect(removedCommandName).toBe('recent files');
});

test('recentfExtension command handler opens completion', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  expect(api.core.useCompletion().open).toHaveBeenCalled();
});

test('recentfExtension completion opens with choice type', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  expect(capturedCompletionConfig?.type).toBe('choice');
});

test('recentfExtension completion has correct placeholder', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  expect(capturedCompletionConfig?.placeholder).toBe('Recent files...');
});

test('recentfExtension itemsGetter is a function', async () => {
  const api = createMockApi();

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  expect(typeof capturedCompletionConfig?.itemsGetter).toBe('function');
});

test('recentfExtension itemsGetter returns files for empty query', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['recent1.org'], title: 'Recent 1', touchedAt: '2026-02-05T10:00:00Z' },
    { id: '2', filePath: ['recent2.org'], title: 'Recent 2', touchedAt: '2026-02-05T09:00:00Z' },
  );

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(2);
  expect(result.total).toBe(2);
});

test('recentfExtension itemsGetter filters files by title', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['meeting.org'], title: 'Meeting Notes', touchedAt: '2026-02-05T10:00:00Z' },
    { id: '2', filePath: ['todo.org'], title: 'Todo List', touchedAt: '2026-02-05T09:00:00Z' },
  );

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'Meeting',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
  expect(result.result[0]!.title).toBe('Meeting Notes');
});

test('recentfExtension itemsGetter finds matches beyond first page', async () => {
  const api = createMockApi();

  for (let i = 0; i < 25; i++) {
    mockFiles.push({
      id: `${i}`,
      filePath: [`note${i}.org`],
      title: `Note ${i}`,
      touchedAt: '2026-02-05T10:00:00Z',
    });
  }
  mockFiles.push({
    id: 'target',
    filePath: ['target.org'],
    title: 'Meeting Target',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'meeting',
    10,
    0,
  )) as CompletionSearchResult;

  expect(result.total).toBe(1);
  expect(result.result).toHaveLength(1);
  expect(result.result[0]!.title).toBe('Meeting Target');
});

test('recentfExtension itemsGetter filters case-insensitively', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['work.org'], title: 'Work Notes', touchedAt: '2026-02-05T10:00:00Z' },
  );

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'work',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
});

test('recentfExtension itemsGetter respects limit parameter', async () => {
  const api = createMockApi();

  for (let i = 0; i < 10; i++) {
    mockFiles.push({
      id: `${i}`,
      filePath: [`note${i}.org`],
      title: `Note ${i}`,
      touchedAt: '2026-02-05T10:00:00Z',
    });
  }

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    5,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(5);
});

test('recentfExtension itemsGetter respects offset parameter', async () => {
  const api = createMockApi();

  for (let i = 0; i < 10; i++) {
    mockFiles.push({
      id: `${i}`,
      filePath: [`note${i}.org`],
      title: `Note ${i}`,
      touchedAt: '2026-02-05T10:00:00Z',
    });
  }

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    5,
    3,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(5);
  expect((result.result[0]!.data as FileMeta)?.id).toBe('3');
});

test('recentfExtension itemsGetter returns correct total for empty query', async () => {
  const api = createMockApi();

  for (let i = 0; i < 50; i++) {
    mockFiles.push({
      id: `${i}`,
      filePath: [`note${i}.org`],
      title: `Note ${i}`,
      touchedAt: '2026-02-05T10:00:00Z',
    });
  }

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    10,
    0,
  )) as CompletionSearchResult;

  expect(result.total).toBe(50);
});

test('recentfExtension itemsGetter returns filtered total for non-empty query', async () => {
  const api = createMockApi();

  mockFiles.push(
    { id: '1', filePath: ['meeting1.org'], title: 'Meeting 1', touchedAt: '2026-02-05T10:00:00Z' },
    { id: '2', filePath: ['meeting2.org'], title: 'Meeting 2', touchedAt: '2026-02-05T09:00:00Z' },
    { id: '3', filePath: ['todo.org'], title: 'Todo', touchedAt: '2026-02-05T08:00:00Z' },
  );

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'Meeting',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.total).toBe(2);
});

test('recentfExtension candidate has history icon', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.icon).toBe('sym_o_history');
});

test('recentfExtension candidate uses file title', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'My Title',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.title).toBe('My Title');
});

test('recentfExtension candidate uses filename when no title', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['folder', 'untitled.org'],
    title: undefined,
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.title).toBe('untitled.org');
});

test('recentfExtension candidate contains original file data', async () => {
  const api = createMockApi();

  const file: FileMeta = {
    id: 'data-id',
    filePath: ['data.org'],
    title: 'Data File',
    touchedAt: '2026-02-05T10:00:00Z',
  };
  mockFiles.push(file);

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.data).toEqual(file);
});

test('recentfExtension candidate commandHandler opens buffer', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['folder', 'test.org'],
    title: 'Test',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;
  result.result[0]!.commandHandler(api);

  expect(api.core.useBufferViewer().open).toHaveBeenCalledWith('/folder/test.org');
});

test('recentfExtension candidate commandHandler closes completion', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;
  result.result[0]!.commandHandler(api);

  expect(api.core.useCompletion().close).toHaveBeenCalled();
});

test('recentfExtension candidate description shows just now for recent files', async () => {
  const api = createMockApi();
  const now = new Date().toISOString();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: now,
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('just now');
});

test('recentfExtension candidate description shows minutes ago', async () => {
  const api = createMockApi();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: fiveMinutesAgo,
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('5m ago');
});

test('recentfExtension candidate description shows hours ago', async () => {
  const api = createMockApi();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: twoHoursAgo,
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('2h ago');
});

test('recentfExtension candidate description shows days ago', async () => {
  const api = createMockApi();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: threeDaysAgo,
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('3d ago');
});

test('recentfExtension candidate description shows date for old files', async () => {
  const api = createMockApi();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: twoWeeksAgo.toISOString(),
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe(twoWeeksAgo.toLocaleDateString());
});

test('recentfExtension candidate description handles undefined touchedAt', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['test.org'],
    title: 'Test',
    touchedAt: undefined,
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result[0]!.description).toBe('');
});

test('recentfExtension itemsGetter filters by filename when no title', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['meeting-notes.org'],
    title: undefined,
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'meeting',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
});

test('recentfExtension whitespace-only query returns all files', async () => {
  const api = createMockApi();

  mockFiles.push({
    id: '1',
    filePath: ['recent.org'],
    title: 'Recent',
    touchedAt: '2026-02-05T10:00:00Z',
  });

  await recentfExtension.onMounted?.(api);
  await registeredCommand?.handler(api);

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '   ',
    20,
    0,
  )) as CompletionSearchResult;

  expect(result.result).toHaveLength(1);
});
