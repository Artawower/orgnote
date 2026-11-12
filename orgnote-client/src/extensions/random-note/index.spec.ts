import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ref, toValue } from 'vue';
import type {
  Command,
  CompletionConfig,
  FileMeta,
  FileSearchResult,
  OrgNoteApi,
} from 'orgnote-api';
import { randomNoteExtension } from './index';

const RANDOM_NOTE_COMMAND = 'random note';
const RANDOM_NOTE_BY_SEARCH_COMMAND = 'random note by search';

const registeredCommands: Command[] = [];
const removedCommands: Command[] = [];
const createdApis: OrgNoteApi[] = [];
const files: FileMeta[] = [];
const searchMatches: FileMeta[] = [];
const lastSearchResult = ref<FileSearchResult | null>(null);
const completionOpen = vi.fn();
const bufferOpen = vi.fn();
const notify = vi.fn();
let completionResult: string | undefined;
let capturedCompletion: CompletionConfig<string> | undefined;
let activeFilePath: string | undefined;

const createMockApi = (): OrgNoteApi => {
  const commands = {
    add: vi.fn((...newCommands: Command[]) => registeredCommands.push(...newCommands)),
    remove: vi.fn((...commandsToRemove: Command[]) => removedCommands.push(...commandsToRemove)),
  };
  const fileMeta = {
    count: vi.fn(async () => files.length),
    getAll: vi.fn(async ({ limit = files.length, offset = 0 } = {}) =>
      files.slice(offset, offset + limit),
    ),
  };
  const fileSearch = {
    lastSearchResult,
    search: vi.fn(async (query: string, { limit = 20, offset = 0 } = {}) => {
      const matchedFiles = searchMatches.slice(offset, offset + limit);
      lastSearchResult.value = {
        files: matchedFiles,
        total: searchMatches.length,
        query,
        searchedAt: Date.now(),
      };
      return matchedFiles;
    }),
  };
  const completion = {
    open: completionOpen.mockImplementation(async (config: CompletionConfig<string>) => {
      capturedCompletion = config;
      return completionResult;
    }),
  };

  const api = {
    core: {
      useCommands: vi.fn(() => commands),
      useFileMeta: vi.fn(() => fileMeta),
      useFileSearch: vi.fn(() => fileSearch),
      useCompletion: vi.fn(() => completion),
      useBufferViewer: vi.fn(() => ({ open: bufferOpen })),
      useNotifications: vi.fn(() => ({ notify })),
      usePane: vi.fn(() => ({
        activeBufferUri: activeFilePath ? `file://${activeFilePath}` : undefined,
      })),
      useEditor: vi.fn(() => ({ activeContext: undefined })),
    },
  } as unknown as OrgNoteApi;

  createdApis.push(api);
  return api;
};

const getCommand = (name: string): Command => {
  const command = registeredCommands.find((candidate) => candidate.command === name);
  if (!command) throw new TypeError(`Expected ${name} command`);
  return command;
};

const executeCommand = async (api: OrgNoteApi, name: string): Promise<void> => {
  const command = getCommand(name);
  await command.handler(api, { meta: command });
};

beforeEach(() => {
  registeredCommands.length = 0;
  removedCommands.length = 0;
  files.length = 0;
  searchMatches.length = 0;
  lastSearchResult.value = null;
  completionResult = undefined;
  capturedCompletion = undefined;
  activeFilePath = undefined;
  vi.clearAllMocks();
});

afterEach(async () => {
  await Promise.all(createdApis.map((api) => randomNoteExtension.onUnmounted?.(api)));
  createdApis.length = 0;
  vi.restoreAllMocks();
});

test('randomNoteExtension registers random and filtered commands', async () => {
  const api = createMockApi();

  await randomNoteExtension.onMounted?.(api);

  expect(registeredCommands.map((command) => command.command)).toEqual([
    RANDOM_NOTE_COMMAND,
    RANDOM_NOTE_BY_SEARCH_COMMAND,
  ]);
});

test('randomNoteExtension registers distinct random and search icons', async () => {
  const api = createMockApi();

  await randomNoteExtension.onMounted?.(api);

  expect(registeredCommands).toEqual([
    expect.objectContaining({ icon: 'sym_o_casino', interactive: true }),
    expect.objectContaining({ icon: 'sym_o_manage_search', interactive: true }),
  ]);
});

test('random note command opens a note at a random offset', async () => {
  const api = createMockApi();
  files.push(
    { id: '1', filePath: ['one.org'] },
    { id: '2', filePath: ['two.org'] },
    { id: '3', filePath: ['three.org'] },
    { id: '4', filePath: ['folder', 'four.org'] },
  );
  vi.spyOn(Math, 'random').mockReturnValue(0.75);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_COMMAND);

  expect(api.core.useFileMeta().getAll).toHaveBeenCalledWith({ limit: 1, offset: 3 });
  expect(bufferOpen).toHaveBeenCalledWith('/folder/four.org');
});

test('random note command excludes the active note', async () => {
  const api = createMockApi();
  activeFilePath = '/current.org';
  files.push(
    { id: 'current', filePath: ['current.org'] },
    { id: 'other', filePath: ['other.org'] },
  );
  vi.spyOn(Math, 'random').mockReturnValue(0);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_COMMAND);

  expect(api.core.useFileMeta().getAll).toHaveBeenNthCalledWith(1, { limit: 1, offset: 0 });
  expect(api.core.useFileMeta().getAll).toHaveBeenNthCalledWith(2, { limit: 1, offset: 1 });
  expect(bufferOpen).toHaveBeenCalledWith('/other.org');
});

test('random note command notifies when the active note is the only note', async () => {
  const api = createMockApi();
  activeFilePath = '/current.org';
  files.push({ id: 'current', filePath: ['current.org'] });
  vi.spyOn(Math, 'random').mockReturnValue(0);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_COMMAND);

  expect(notify).toHaveBeenCalledWith({ message: 'No notes available', level: 'info' });
  expect(bufferOpen).not.toHaveBeenCalled();
});

test('random note by search opens a random full-text match', async () => {
  const api = createMockApi();
  completionResult = 'knowledge';
  searchMatches.push(
    { id: '1', filePath: ['match-one.org'] },
    { id: '2', filePath: ['match-two.org'] },
    { id: '3', filePath: ['folder', 'match-three.org'] },
    { id: '4', filePath: ['match-four.org'] },
  );
  vi.spyOn(Math, 'random').mockReturnValue(0.5);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(capturedCompletion).toEqual(
    expect.objectContaining({ type: 'input', searchText: '' }),
  );
  expect(api.core.useFileSearch().search).toHaveBeenNthCalledWith(1, 'knowledge', {
    limit: 1,
    offset: 0,
  });
  expect(api.core.useFileSearch().search).toHaveBeenNthCalledWith(2, 'knowledge', {
    limit: 1,
    offset: 2,
  });
  expect(bufferOpen).toHaveBeenCalledWith('/folder/match-three.org');
});

test('random note by search excludes the active note', async () => {
  const api = createMockApi();
  activeFilePath = '/folder/match-three.org';
  completionResult = 'knowledge';
  searchMatches.push(
    { id: '1', filePath: ['match-one.org'] },
    { id: '2', filePath: ['match-two.org'] },
    { id: '3', filePath: ['folder', 'match-three.org'] },
    { id: '4', filePath: ['match-four.org'] },
  );
  vi.spyOn(Math, 'random').mockReturnValue(0.5);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(api.core.useFileSearch().search).toHaveBeenNthCalledWith(2, 'knowledge', {
    limit: 1,
    offset: 2,
  });
  expect(api.core.useFileSearch().search).toHaveBeenNthCalledWith(3, 'knowledge', {
    limit: 1,
    offset: 1,
  });
  expect(bufferOpen).toHaveBeenCalledWith('/match-two.org');
  expect(bufferOpen).not.toHaveBeenCalledWith('/folder/match-three.org');
});

test('random note by search notifies when only the active note matches', async () => {
  const api = createMockApi();
  activeFilePath = '/current.org';
  completionResult = 'knowledge';
  searchMatches.push({ id: 'current', filePath: ['current.org'] });
  vi.spyOn(Math, 'random').mockReturnValue(0);

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(notify).toHaveBeenCalledWith({
    message: 'No notes match the search query',
    level: 'info',
  });
  expect(bufferOpen).not.toHaveBeenCalled();
});

test('random note by search reuses the last successful query', async () => {
  const api = createMockApi();
  completionResult = 'knowledge';
  searchMatches.push({ id: '1', filePath: ['match.org'] });

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);
  completionResult = undefined;
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  const command = getCommand(RANDOM_NOTE_BY_SEARCH_COMMAND);
  expect(capturedCompletion?.searchText).toBe('knowledge');
  expect(toValue(command.description)).toBe('Last search: knowledge');
});

test('randomNoteExtension unmount removes commands and clears the last search', async () => {
  const api = createMockApi();
  completionResult = 'knowledge';
  searchMatches.push({ id: '1', filePath: ['match.org'] });

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);
  await randomNoteExtension.onUnmounted?.(api);

  expect(removedCommands.map((command) => command.command)).toEqual([
    RANDOM_NOTE_COMMAND,
    RANDOM_NOTE_BY_SEARCH_COMMAND,
  ]);

  registeredCommands.length = 0;
  completionResult = undefined;
  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(capturedCompletion?.searchText).toBe('');
});

test('random note command notifies when the vault is empty', async () => {
  const api = createMockApi();

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_COMMAND);

  expect(notify).toHaveBeenCalledWith({ message: 'No notes available', level: 'info' });
  expect(bufferOpen).not.toHaveBeenCalled();
});

test('failed filtered search keeps the last successful query', async () => {
  const api = createMockApi();
  completionResult = 'knowledge';
  searchMatches.push({ id: '1', filePath: ['match.org'] });

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);
  searchMatches.length = 0;
  completionResult = 'missing';
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(notify).toHaveBeenCalledWith({
    message: 'No notes match the search query',
    level: 'info',
  });

  completionResult = undefined;
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);
  expect(capturedCompletion?.searchText).toBe('knowledge');
});

test('cancelled filtered search does not query the file index', async () => {
  const api = createMockApi();

  await randomNoteExtension.onMounted?.(api);
  await executeCommand(api, RANDOM_NOTE_BY_SEARCH_COMMAND);

  expect(api.core.useFileSearch().search).not.toHaveBeenCalled();
  expect(capturedCompletion?.validateInput?.('   ')).toEqual({
    valid: false,
    message: 'Enter a search query',
  });
});
