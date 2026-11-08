import { beforeEach, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { ErrorFileNotFound } from 'orgnote-api';

const mockRead = vi.fn();
const mockWrite = vi.fn();
const mockReportError = vi.fn();
const mockGetAll = vi.fn();
const mockIsIndexing = ref(false);
const mockGetExtensionConfig = vi.fn(() => ({ value: {} }));

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileContent: () => ({ read: mockRead, write: mockWrite }),
      useFileMeta: () => ({ getAll: mockGetAll }),
      useExtensions: () => ({ getExtensionConfig: mockGetExtensionConfig }),
      useFileWatcher: () => ({ watch: vi.fn() }),
      useFileSearch: () => ({ isIndexing: mockIsIndexing }),
    },
  },
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: mockReportError, reportInfo: vi.fn() },
}));

vi.mock('src/extensions/org-agenda/manifest', () => ({
  orgAgendaManifest: { name: 'org-agenda' },
}));

const { useAgendaTasksStore } = await import('./agenda-tasks-store');

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mockGetAll.mockResolvedValue([]);
  mockIsIndexing.value = false;
  mockWrite.mockResolvedValue(undefined);
});

test('createTaskInFile_treatsFileNotFound_asEmptyFile', async () => {
  mockRead.mockRejectedValue(new ErrorFileNotFound('/inbox.org'));
  const store = useAgendaTasksStore();

  const ok = await store.createTaskInFile({ title: 'New task' });

  expect(ok).toBe(true);
  expect(mockWrite).toHaveBeenCalledOnce();
  const [, content] = mockWrite.mock.calls[0] as [string, Uint8Array];
  const text = new TextDecoder().decode(content);
  expect(text).toContain('* TODO New task');
});

test('createTaskInFile_abortsWrite_whenReadFailsWithUnknownError', async () => {
  mockRead.mockRejectedValue(new Error('Permission denied'));
  const store = useAgendaTasksStore();

  const ok = await store.createTaskInFile({ title: 'New task' });

  expect(ok).toBe(false);
  expect(mockWrite).not.toHaveBeenCalled();
  expect(mockReportError).toHaveBeenCalledOnce();
});

test('createTaskInFile_returnsFalse_whenWriteFails', async () => {
  mockRead.mockRejectedValue(new ErrorFileNotFound('/inbox.org'));
  mockWrite.mockRejectedValue(new Error('Disk full'));
  const store = useAgendaTasksStore();

  const ok = await store.createTaskInFile({ title: 'New task' });

  expect(ok).toBe(false);
  expect(mockReportError).toHaveBeenCalledOnce();
});

test('ensureLoaded shares one metadata request between concurrent buffers', async () => {
  let resolveFiles!: (files: []) => void;
  const filesPromise = new Promise<[]>((resolve) => {
    resolveFiles = resolve;
  });
  mockGetAll.mockReturnValue(filesPromise);
  const store = useAgendaTasksStore();

  const firstLoad = store.ensureLoaded();
  const secondLoad = store.ensureLoaded();

  expect(mockGetAll).toHaveBeenCalledOnce();
  resolveFiles([]);
  await Promise.all([firstLoad, secondLoad]);
});

test('Agenda reloads metadata after content indexing completes', async () => {
  const existingFile = {
    id: 'existing',
    filePath: ['agenda', 'existing.org'],
    title: 'Existing',
    tasks: [],
  };
  const indexedFile = {
    id: 'orgnote',
    filePath: ['agenda', 'orgnote.org'],
    title: 'OrgNote',
    tasks: [{ id: 'task-1', kind: 'headline-todo', state: 'todo', text: 'Indexed task' }],
  };
  mockGetAll
    .mockResolvedValueOnce([existingFile])
    .mockResolvedValue([existingFile, indexedFile]);
  const store = useAgendaTasksStore();

  await store.ensureLoaded();
  mockIsIndexing.value = true;
  await nextTick();
  mockIsIndexing.value = false;

  await vi.waitFor(() => {
    expect(store.allFiles.map((file) => file.id)).toEqual(['existing', 'orgnote']);
  });
});

test('loadFiles makes agenda tasks searchable through the task index', async () => {
  mockGetAll.mockResolvedValue([
    {
      id: 'work',
      filePath: ['agenda', 'work.org'],
      title: 'Work',
      tasks: [
        {
          id: 'task-1',
          kind: 'headline-todo',
          state: 'todo',
          text: 'Prepare quarterly review',
          tags: ['planning'],
        },
      ],
    },
  ]);
  const store = useAgendaTasksStore();

  await store.loadFiles();

  expect(store.searchTaskIds('quarter')).toEqual(['/agenda/work.org\u0000task-1']);
});
