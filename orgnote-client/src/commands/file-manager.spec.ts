import { test, expect, vi } from 'vitest';
import { getFileManagerCommands } from './file-manager';
import { DefaultCommands, I18N, RouteNames, type Command, type OrgNoteApi } from 'orgnote-api';
import type { Router } from 'vue-router';
import type { Tab } from 'orgnote-api';
import { FileManagerRef } from 'src/containers/file-manager-ref';
import { getFileDirPath } from 'src/utils/get-file-dir-path';

vi.mock('src/composables/create-file-completion', () => ({
  createFileCompletion: vi.fn(),
}));

vi.mock('src/utils/get-file-dir-path', () => ({
  getFileDirPath: vi.fn(),
}));

vi.mock('src/composables/file-rename-completion', () => ({
  useFileRenameCompletion: vi.fn(),
}));

type BuildMockApiOverrides = {
  fileManager?: Record<string, unknown>;
  completion?: {
    open?: ReturnType<typeof vi.fn>;
  };
  commands?: {
    execute?: ReturnType<typeof vi.fn>;
  };
  pane?: {
    activeBufferUri?: string;
    activeTab?: Partial<Tab>;
  };
  editor?: {
    activeContext?: {
      filePath?: string;
    };
  };
  sidebar?: {
    opened?: boolean;
    component?: unknown;
    openComponent?: ReturnType<typeof vi.fn>;
  };
  fileSystemManager?: {
    currentFs?: {
      isDirExist: (path: string) => Promise<boolean>;
      isFileExist: (path: string) => Promise<boolean>;
    };
  };
  fileSystem?: {
    rename?: ReturnType<typeof vi.fn>;
    copyFile?: ReturnType<typeof vi.fn>;
  };
};

const buildMockApi = (overrides: BuildMockApiOverrides = {}) => {
  const fileManager = {
    operationTargets: [],
    path: '/notes',
    searchQuery: '',
    files: [],
    ...overrides.fileManager,
  };

  const completion = {
    open: vi.fn(),
    ...overrides.completion,
  };

  const commands = {
    execute: vi.fn(),
    ...overrides.commands,
  };

  const pane = {
    activeBufferUri: undefined,
    activeTab: undefined,
    ...overrides.pane,
  };

  const editor = {
    activeContext: undefined,
    ...overrides.editor,
  };

  const sidebar = {
    opened: false,
    component: undefined,
    openComponent: vi.fn(),
    ...overrides.sidebar,
  };

  const fileSystemManager = {
    currentFs: {
      isDirExist: vi.fn(async () => true),
      isFileExist: vi.fn(async () => false),
    },
    ...overrides.fileSystemManager,
  };

  const fileSystem = {
    rename: vi.fn(),
    copyFile: vi.fn(),
    ...overrides.fileSystem,
  };

  const api: Partial<OrgNoteApi> = {
    core: {
      useFileManager: () => fileManager,
      useCompletion: () => completion,
      useCommands: () => commands,
      usePane: () => pane,
      useEditor: () => editor,
      useFileSystemManager: () => fileSystemManager,
      useFileSystem: () => fileSystem,
    } as unknown as OrgNoteApi['core'],
    ui: {
      useSidebar: () => sidebar,
    } as unknown as OrgNoteApi['ui'],
  };

  return {
    api: api as OrgNoteApi,
    fileManager,
    completion,
    commands,
    fileSystem,
    sidebar,
  };
};

const getCommandOrThrow = (name: string): Command => {
  const command = getFileManagerCommands().find((item) => item.command === name);
  expect(command).toBeDefined();
  if (!command) {
    throw new Error(`Command not found: ${name}`);
  }
  return command;
};

test('CREATE_NOTE command calls OPEN_NOTE after successful file creation', async () => {
  const { createFileCompletion } = await import('src/composables/create-file-completion');
  const { getFileDirPath } = await import('src/utils/get-file-dir-path');

  vi.mocked(createFileCompletion).mockResolvedValue('/test/my-note.org');
  vi.mocked(getFileDirPath).mockReturnValue('/test');

  const { api, fileManager, commands } = buildMockApi({
    fileManager: { path: '' },
  });

  const createNoteCommand = getCommandOrThrow(DefaultCommands.CREATE_NOTE);
  await createNoteCommand.handler(api, { data: {}, meta: {} });

  expect(fileManager.path).toBe('/test');
  expect(commands.execute).toHaveBeenCalledWith(DefaultCommands.OPEN_NOTE, {
    path: '/test/my-note.org',
  });
});

test('CREATE_NOTE command does not call OPEN_NOTE when file creation fails', async () => {
  const { createFileCompletion } = await import('src/composables/create-file-completion');
  vi.mocked(createFileCompletion).mockResolvedValue('');

  const { api, commands } = buildMockApi({
    fileManager: { path: '' },
  });

  const createNoteCommand = getCommandOrThrow(DefaultCommands.CREATE_NOTE);
  await createNoteCommand.handler(api, { data: {}, meta: {} });

  expect(commands.execute).not.toHaveBeenCalled();
});

test('RENAME_FILE command uses path from params when provided', async () => {
  const { useFileRenameCompletion } = await import('src/composables/file-rename-completion');

  const { api } = buildMockApi({
    fileManager: { focusFile: undefined },
  });

  const renameCommand = getCommandOrThrow(DefaultCommands.RENAME_FILE);
  await renameCommand.handler(api, {
    data: { path: '/test/renamed.org' },
    meta: {},
  });

  expect(useFileRenameCompletion).toHaveBeenCalledWith(api, '/test/renamed.org');
});

test('COPY_FILE command uses path from params when provided', async () => {
  const startCopy = vi.fn();
  const { api } = buildMockApi({
    fileManager: { operationTargets: [], startCopy },
  });

  const copyCommand = getCommandOrThrow(DefaultCommands.COPY_FILE);
  await copyCommand.handler(api, {
    data: { path: '/test/copied.org' },
    meta: {},
  });

  expect(startCopy).toHaveBeenCalledWith(['/test/copied.org']);
});

test('MOVE_FILE command uses paths from params when provided', async () => {
  const startMove = vi.fn();
  const { api } = buildMockApi({
    fileManager: { operationTargets: [], startMove },
  });

  const moveCommand = getCommandOrThrow(DefaultCommands.MOVE_FILE);
  await moveCommand.handler(api, {
    data: { paths: ['/test/moved.org'] },
    meta: {},
  });

  expect(startMove).toHaveBeenCalledWith(['/test/moved.org']);
});

test('COPY_FILE command executes pending operation in interactive mode', async () => {
  const startCopy = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockResolvedValue('/dest');

  const { api, completion } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'copy', paths: ['/test/copied.org'] },
      startCopy,
      executePending,
      cancelPending,
    },
    completion: { open },
  });

  const copyCommand = getCommandOrThrow(DefaultCommands.COPY_FILE);
  await copyCommand.handler(api, {
    data: { path: '/test/copied.org', interactive: true },
    meta: {},
  });

  expect(startCopy).toHaveBeenCalledWith(['/test/copied.org']);
  expect(completion.open).toHaveBeenCalledWith({
    type: 'input-choice',
    searchText: '/notes',
    placeholder: I18N.PICK_FOLDER,
    itemsGetter: expect.any(Function),
  });
  expect(executePending).toHaveBeenCalledWith('/dest');
  expect(cancelPending).not.toHaveBeenCalled();
});

test('MOVE_FILE command cancels pending operation when interactive path is empty', async () => {
  const startMove = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockResolvedValue('');

  const { api } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'move', paths: ['/test/moved.org'] },
      startMove,
      executePending,
      cancelPending,
    },
    completion: { open },
  });

  const moveCommand = getCommandOrThrow(DefaultCommands.MOVE_FILE);
  await moveCommand.handler(api, {
    data: { path: '/test/moved.org', interactive: true },
    meta: {},
  });

  expect(startMove).toHaveBeenCalledWith(['/test/moved.org']);
  expect(executePending).not.toHaveBeenCalled();
  expect(cancelPending).toHaveBeenCalled();
});

test('MOVE_FILE command executes pending operation in interactive mode', async () => {
  const startMove = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockResolvedValue('/dest');

  const { api } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'move', paths: ['/test/moved.org'] },
      startMove,
      executePending,
      cancelPending,
    },
    completion: { open },
  });

  const moveCommand = getCommandOrThrow(DefaultCommands.MOVE_FILE);
  await moveCommand.handler(api, {
    data: { path: '/test/moved.org', interactive: true },
    meta: {},
  });

  expect(startMove).toHaveBeenCalledWith(['/test/moved.org']);
  expect(executePending).toHaveBeenCalledWith('/dest');
  expect(cancelPending).not.toHaveBeenCalled();
});

test('MOVE_FILE command supports explicit destination file path for single source', async () => {
  const startMove = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockResolvedValue('/test/new-name.org');
  const rename = vi.fn();
  const execute = vi.fn();

  const { api } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'move', paths: ['/test/old-name.org'] },
      startMove,
      executePending,
      cancelPending,
    },
    fileSystemManager: {
      currentFs: {
        isDirExist: vi.fn(async () => false),
        isFileExist: vi.fn(async () => false),
      },
    },
    fileSystem: {
      rename,
    },
    commands: { execute },
    pane: { activeBufferUri: 'file:///test/old-name.org' },
    completion: { open },
  });

  const moveCommand = getCommandOrThrow(DefaultCommands.MOVE_FILE);
  await moveCommand.handler(api, {
    data: { path: '/test/old-name.org', interactive: true },
    meta: {},
  });

  expect(startMove).toHaveBeenCalledWith(['/test/old-name.org']);
  expect(rename).toHaveBeenCalledWith('/test/old-name.org', '/test/new-name.org');
  expect(executePending).not.toHaveBeenCalled();
  expect(cancelPending).toHaveBeenCalled();
  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_NOTE, { path: '/test/new-name.org' });
});

test('COPY_FILE command cancels pending operation when interactive path is empty', async () => {
  const startCopy = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockResolvedValue('');

  const { api } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'copy', paths: ['/test/copied.org'] },
      startCopy,
      executePending,
      cancelPending,
    },
    completion: { open },
  });

  const copyCommand = getCommandOrThrow(DefaultCommands.COPY_FILE);
  await copyCommand.handler(api, {
    data: { path: '/test/copied.org', interactive: true },
    meta: {},
  });

  expect(startCopy).toHaveBeenCalledWith(['/test/copied.org']);
  expect(executePending).not.toHaveBeenCalled();
  expect(cancelPending).toHaveBeenCalled();
});

test('COPY_FILE command does nothing when no targets available', async () => {
  const startCopy = vi.fn();
  const { api, completion } = buildMockApi({
    fileManager: {
      operationTargets: [],
      startCopy,
    },
  });

  const copyCommand = getCommandOrThrow(DefaultCommands.COPY_FILE);
  await copyCommand.handler(api, {
    data: {},
    meta: {},
  });

  expect(startCopy).not.toHaveBeenCalled();
  expect(completion.open).not.toHaveBeenCalled();
});

test('MOVE_FILE command does nothing when no targets available', async () => {
  const startMove = vi.fn();
  const { api, completion } = buildMockApi({
    fileManager: {
      operationTargets: [],
      startMove,
    },
  });

  const moveCommand = getCommandOrThrow(DefaultCommands.MOVE_FILE);
  await moveCommand.handler(api, {
    data: {},
    meta: {},
  });

  expect(startMove).not.toHaveBeenCalled();
  expect(completion.open).not.toHaveBeenCalled();
});

test('COPY_FILE command cancels pending operation when interactive completion fails', async () => {
  const startCopy = vi.fn();
  const executePending = vi.fn();
  const cancelPending = vi.fn();
  const open = vi.fn().mockRejectedValue(new Error('completion failed'));

  const { api } = buildMockApi({
    fileManager: {
      operationTargets: [],
      path: '/notes',
      pendingOperation: { type: 'copy', paths: ['/test/copied.org'] },
      startCopy,
      executePending,
      cancelPending,
    },
    completion: { open },
  });

  const copyCommand = getCommandOrThrow(DefaultCommands.COPY_FILE);

  await expect(
    copyCommand.handler(api, {
      data: { path: '/test/copied.org', interactive: true },
      meta: {},
    }),
  ).rejects.toThrow('Failed to pick destination');

  expect(startCopy).toHaveBeenCalledWith(['/test/copied.org']);
  expect(executePending).not.toHaveBeenCalled();
  expect(cancelPending).toHaveBeenCalled();
});

test('REVEAL_IN_FILE_MANAGER reveals the active file from another sidebar view', async () => {
  vi.mocked(getFileDirPath).mockReturnValue('/notes');
  const openComponent = vi.fn();
  const { api, fileManager } = buildMockApi({
    fileManager: { searchQuery: 'filtered' },
    pane: { activeBufferUri: 'file:///notes/today.org' },
    sidebar: { opened: true, component: {}, openComponent },
  });

  const revealCommand = getCommandOrThrow(DefaultCommands.REVEAL_IN_FILE_MANAGER);
  await revealCommand.handler(api, { data: {}, meta: {} });

  expect(fileManager.path).toBe('/notes');
  expect(fileManager.searchQuery).toBe('');
  expect(openComponent).toHaveBeenCalledWith(FileManagerRef, {
    componentProps: { closable: false, tree: true, compact: true },
  });
});

test('REVEAL_IN_FILE_MANAGER keeps an open file manager visible', async () => {
  vi.mocked(getFileDirPath).mockReturnValue('/notes');
  const openComponent = vi.fn();
  const { api } = buildMockApi({
    pane: { activeBufferUri: 'file:///notes/today.org' },
    sidebar: { opened: true, component: FileManagerRef, openComponent },
  });

  const revealCommand = getCommandOrThrow(DefaultCommands.REVEAL_IN_FILE_MANAGER);
  await revealCommand.handler(api, { data: {}, meta: {} });

  expect(openComponent).not.toHaveBeenCalled();
});

test('RENAME_FILE command reopens active note with new path', async () => {
  const { useFileRenameCompletion } = await import('src/composables/file-rename-completion');
  vi.mocked(useFileRenameCompletion).mockResolvedValue('/test/renamed.org');

  const execute = vi.fn();
  const { api } = buildMockApi({
    fileManager: { focusFile: undefined },
    pane: { activeBufferUri: 'file:///test/old.org' },
    commands: { execute },
  });

  const renameCommand = getCommandOrThrow(DefaultCommands.RENAME_FILE);
  await renameCommand.handler(api, {
    data: { path: '/test/old.org' },
    meta: {},
  });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_NOTE, { path: '/test/renamed.org' });
});

test('EXECUTE_PENDING_FILE_OPERATION reopens active moved note', async () => {
  const executePending = vi.fn();
  const execute = vi.fn();

  const { api } = buildMockApi({
    fileManager: {
      path: '/dest',
      pendingOperation: { type: 'move', paths: ['/test/old.org'] },
      executePending,
    },
    pane: { activeBufferUri: 'file:///test/old.org' },
    commands: { execute },
  });

  const executePendingCommand = getCommandOrThrow(DefaultCommands.EXECUTE_PENDING_FILE_OPERATION);
  await executePendingCommand.handler(api, { data: {}, meta: {} });

  expect(executePending).toHaveBeenCalledWith('/dest');
  expect(execute).toHaveBeenCalledWith(DefaultCommands.OPEN_NOTE, { path: '/dest/old.org' });
});

test('EXECUTE_PENDING_FILE_OPERATION uses router.replace to avoid stale history', async () => {
  const executePending = vi.fn();
  const execute = vi.fn();
  const replace = vi.fn();

  const { api } = buildMockApi({
    fileManager: {
      path: '/dest',
      pendingOperation: { type: 'move', paths: ['/test/old.org'] },
      executePending,
    },
    pane: {
      activeBufferUri: 'file:///test/old.org',
      activeTab: {
        paneId: 'pane-1',
        router: { replace } as unknown as Router,
      },
    },
    commands: { execute },
  });

  const executePendingCommand = getCommandOrThrow(DefaultCommands.EXECUTE_PENDING_FILE_OPERATION);
  await executePendingCommand.handler(api, { data: {}, meta: {} });

  expect(executePending).toHaveBeenCalledWith('/dest');
  expect(replace).toHaveBeenCalledWith({
    name: RouteNames.File,
    params: {
      paneId: 'pane-1',
      path: '/dest/old.org',
    },
  });
  expect(execute).not.toHaveBeenCalled();
});
