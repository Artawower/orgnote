import { test, expect, vi, beforeEach } from 'vitest';
import { getEditorCommands } from './editor-commands';
import { DefaultCommands, KEYBINDING_CONTEXTS, RouteNames } from 'orgnote-api';
import type { OrgNoteApi, FileMeta, CompletionConfig, CompletionSearchResult } from 'orgnote-api';
import { blurEditor, suspendEditorInput } from 'src/utils/editor-primitives';
import { ADD_TITLE_COMMAND } from './title-command';
import { startKeyboardHideWindow } from 'src/utils/android-keyboard-hide';
import { ref } from 'vue';

const { mockCursorLineUp, mockCursorLineDown, mockRequestPropertyAddRow } = vi.hoisted(() => ({
  mockCursorLineUp: vi.fn(),
  mockCursorLineDown: vi.fn(),
  mockRequestPropertyAddRow: vi.fn(),
}));

let capturedCompletionConfig: CompletionConfig<FileMeta> | null = null;
let mockCompletionResult: unknown;

interface MockSearchResult {
  files: FileMeta[];
  total: number;
  query: string;
}

const mockFiles: FileMeta[] = [];
let mockSearchResult: MockSearchResult | null = null;
const mockLastSearchResult = ref<MockSearchResult | null>(null);

const mockInsertInternalLink = vi.fn();
const mockInsertImage = vi.fn();
const mockCompletionClose = vi.fn();
const mockUploadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockFileInfo = vi.fn();

const mockCompletion = {
  open: vi.fn(async (config: CompletionConfig<FileMeta>) => {
    capturedCompletionConfig = config;
    return mockCompletionResult;
  }),
  close: mockCompletionClose,
};

const mockFileSearch = {
  search: vi.fn(async (query: string, options?: { limit?: number; offset?: number }) => {
    const filtered = mockFiles.filter(
      (f) =>
        f.title?.toLowerCase().includes(query.toLowerCase()) ||
        f.description?.toLowerCase().includes(query.toLowerCase()),
    );
    mockSearchResult = {
      files: filtered.slice(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20)),
      total: filtered.length,
      query,
    };
    mockLastSearchResult.value = mockSearchResult;
    return mockSearchResult.files;
  }),
  lastSearchResult: mockLastSearchResult,
};

const mockFileMeta = {
  getAll: vi.fn(async (options?: { limit?: number; offset?: number }) => {
    return mockFiles.slice(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20));
  }),
  count: vi.fn(async () => mockFiles.length),
};

vi.mock('src/composables/use-org-editor', () => ({
  useOrgEditor: () => ({
    orgEditor: {
      insertInternalLink: mockInsertInternalLink,
      insertImage: mockInsertImage,
    },
    withOrgEditor: vi.fn(),
  }),
  isEditorActive: () => true,
}));

vi.mock('src/utils/editor-primitives', () => ({
  blurEditor: vi.fn(),
  suspendEditorInput: vi.fn(),
  resumeEditorInput: vi.fn(),
}));

vi.mock('@codemirror/commands', () => ({
  undo: vi.fn(),
  redo: vi.fn(),
  cursorLineUp: mockCursorLineUp,
  cursorLineDown: mockCursorLineDown,
}));

vi.mock('src/utils/platform-specific', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    androidOnly: (fn: () => unknown) => fn,
  };
});

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: { hide: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('src/extensions/org-property-drawer/property-source', () => ({
  isRootPropertySequenceStart: vi.fn(() => false),
}));

vi.mock('src/extensions/org-property-drawer/property-panel-state', () => ({
  requestPropertyAddRow: mockRequestPropertyAddRow,
}));

vi.mock('src/utils/android-keyboard-hide', () => ({
  startKeyboardHideWindow: vi.fn(),
  isKeyboardHideWindowActive: vi.fn(() => false),
}));

const createMockApi = (editorView: unknown = {}, editDocument?: unknown): OrgNoteApi =>
  ({
    core: {
      useCompletion: () => mockCompletion,
      useFileSearch: () => mockFileSearch,
      useFileMeta: () => mockFileMeta,
      useEditor: () => ({
        activeContext: {
          editorViewGetter: () => editorView,
          orgNode: undefined,
          filePath: '/docs/info.org',
        },
        editActiveDocument: (mutate: (ctx: unknown) => void) => {
          if (!editDocument) return false;
          mutate(editDocument);
          return true;
        },
      }),
      usePane: () => ({
        activeBufferUri: 'file://root.org',
        activeRoute: {
          name: RouteNames.File,
          params: {
            path: 'root.org',
          },
        },
        activeTab: {
          router: {
            currentRoute: {
              value: {
                name: RouteNames.File,
                params: {
                  path: 'root.org',
                },
              },
            },
          },
        },
      }),
      useFileSystem: () => ({
        writeFile: mockWriteFile,
        fileInfo: mockFileInfo,
      }),
    },
    utils: {
      uploadFile: mockUploadFile,
    },
    ui: {
      useKeyboardState: () => ({ keyboardOpened: ref(false) }),
    },
  }) as unknown as OrgNoteApi;

const findInternalLinkCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_INSERT_INTERNAL_LINK)!;
};

const findInsertImageCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_INSERT_IMAGE)!;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFiles.length = 0;
  mockSearchResult = null;
  mockLastSearchResult.value = null;
  capturedCompletionConfig = null;
  mockCompletionResult = undefined;
  mockInsertImage.mockReset();
  mockUploadFile.mockReset();
  mockWriteFile.mockReset();
  mockFileInfo.mockReset();
  mockFileInfo.mockResolvedValue(undefined);
  mockCursorLineUp.mockReset();
  mockCursorLineDown.mockReset();
  mockRequestPropertyAddRow.mockReset();
  vi.useRealTimers();
});

const findAddTitleCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === ADD_TITLE_COMMAND)!;
};

const findAddPropertyCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_ADD_PROPERTY)!;
};

const findCaretUpCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_CARET_UP)!;
};

const findCaretDownCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_CARET_DOWN)!;
};

test('editor-commands EDITOR_INSERT_INTERNAL_LINK opens completion with type choice', async () => {
  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(capturedCompletionConfig?.type).toBe('choice');
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK returns files for empty query', async () => {
  mockFiles.push(
    { id: '1', filePath: ['note1.org'], title: 'Note 1' },
    { id: '2', filePath: ['note2.org'], title: 'Note 2' },
  );

  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult<FileMeta>;

  expect(result.result).toHaveLength(2);
  expect(result.total).toBe(2);
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK returns files for whitespace query', async () => {
  mockFiles.push({ id: '1', filePath: ['note.org'], title: 'Note' });

  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '   ',
    20,
    0,
  )) as CompletionSearchResult<FileMeta>;

  expect(result.result).toHaveLength(1);
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK searches files with non-empty query', async () => {
  mockFiles.push(
    { id: '1', filePath: ['meeting.org'], title: 'Meeting Notes' },
    { id: '2', filePath: ['todo.org'], title: 'Todo List' },
  );

  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    'Meeting',
    20,
    0,
  )) as CompletionSearchResult<FileMeta>;

  expect(result.result).toHaveLength(2);
  expect(result.result[0]!.title).toBe('Create note “Meeting”');
  expect(result.result[1]!.title).toBe('Meeting Notes');
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK inserts selected existing note', async () => {
  const file = { id: 'note-id-1', filePath: ['test.org'], title: 'Test Title' };
  mockCompletionResult = { kind: 'existing', file };

  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(mockInsertInternalLink).toHaveBeenCalledWith('note-id-1', 'Test Title');
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK candidate uses filename when no title', async () => {
  mockFiles.push({ id: '1', filePath: ['folder', 'untitled.org'], title: undefined });

  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  const result = (await capturedCompletionConfig?.itemsGetter?.(
    '',
    20,
    0,
  )) as CompletionSearchResult<FileMeta>;

  expect(result.result[0]!.title).toBe('untitled.org');
});

test('editor-commands EDITOR_INSERT_INTERNAL_LINK sets placeholder', async () => {
  const api = createMockApi();
  const command = findInternalLinkCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(capturedCompletionConfig?.placeholder).toBeDefined();
});

test('editor-commands EDITOR_INSERT_IMAGE saves image in active route file directory', async () => {
  const api = createMockApi();
  const command = findInsertImageCommand();
  const file = new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' });
  mockUploadFile.mockResolvedValue(file);

  await command.handler(api, { data: {}, meta: {} });

  expect(mockWriteFile).toHaveBeenCalledWith('image.png', expect.any(Uint8Array));
  expect(mockInsertImage).toHaveBeenCalledWith('image.png');
});

test('editor-commands registers add title command', () => {
  const command = findAddTitleCommand();

  expect(command.command).toBe(ADD_TITLE_COMMAND);
  expect(command.group).toBe('editor');
});

test('editor-commands EDITOR_ADD_PROPERTY uses Mod+Alt+P in shell context', () => {
  const command = findAddPropertyCommand();

  expect(command.defaultHotkeys).toEqual([{ key: 'p', modifiers: ['Mod', 'Alt'] }]);
  expect(command.keybindingContext).toBe(KEYBINDING_CONTEXTS.SHELL);
  expect(command.hide?.(createMockApi())).toBe(false);
});

test('editor-commands EDITOR_ADD_PROPERTY creates page property when no headline is active', async () => {
  const ensure = vi.fn();
  const editorView = {
    state: {
      doc: { toString: () => 'plain text' },
      selection: { main: { head: 0 } },
    },
  };
  const editDocument = {
    doc: {
      root: { childrenList: [] },
      properties: { ensure },
      headlineAt: vi.fn(() => undefined),
    },
    cursorPosition: 0,
  };
  const api = createMockApi(editorView, editDocument);
  const command = findAddPropertyCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(ensure).toHaveBeenCalledOnce();
  expect(mockRequestPropertyAddRow).toHaveBeenCalledWith('page:0');
});

test('editor-commands EDITOR_CARET_UP moves cursor to previous line', async () => {
  const api = createMockApi();
  const command = findCaretUpCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(mockCursorLineUp).toHaveBeenCalledWith({});
});

test('editor-commands EDITOR_CARET_DOWN moves cursor to next line', async () => {
  const api = createMockApi();
  const command = findCaretDownCommand();

  await command.handler(api, { data: {}, meta: {} });

  expect(mockCursorLineDown).toHaveBeenCalledWith({});
});

const findHideKeyboardCommand = () => {
  const commands = getEditorCommands();
  return commands.find((c) => c.command === DefaultCommands.EDITOR_HIDE_KEYBOARD)!;
};

test('editor-commands EDITOR_HIDE_KEYBOARD blurs editor', async () => {
  const api = createMockApi();
  const command = findHideKeyboardCommand();
  await command.handler(api, { data: {}, meta: {} });
  expect(blurEditor).toHaveBeenCalled();
});

test('editor-commands EDITOR_HIDE_KEYBOARD suspends editor input and starts hide window on Android', async () => {
  const api = createMockApi();
  const command = findHideKeyboardCommand();
  await command.handler(api, { data: {}, meta: {} });
  expect(suspendEditorInput).toHaveBeenCalled();
  expect(startKeyboardHideWindow).toHaveBeenCalled();
});
