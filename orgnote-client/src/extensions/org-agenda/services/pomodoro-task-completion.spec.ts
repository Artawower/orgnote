import { beforeEach, expect, test, vi } from 'vitest';
import type { FileMeta, OrgNoteApi } from 'orgnote-api';
import { textToUint8Array, uint8ArrayToText } from 'orgnote-api/utils';
import { parse, withMetaInfo } from 'org-mode-ast';
import { extractFileTasks } from 'src/utils/extract-file-tasks';
import { completePomodoroTaskAfterConfirmation } from './pomodoro-task-completion';

const readFile = vi.fn();
const writeFile = vi.fn();
const confirmCompletion = vi.fn();
const loadFiles = vi.fn();
const tasksStore = {
  allFiles: [] as FileMeta[],
  loadFiles,
};

vi.mock('../stores/agenda-tasks-store', () => ({
  useAgendaTasksStore: () => tasksStore,
}));

vi.mock('src/boot/i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
}));

vi.mock('src/boot/report', () => ({
  reporter: { reportError: vi.fn() },
}));

const HABIT_CONTENT =
  '* TODO Meditate\n' +
  'SCHEDULED: <2026-05-18 Mon .+1d>\n' +
  ':PROPERTIES:\n' +
  ':STYLE: habit\n' +
  ':END:\n';

const parseTasks = (content: string) =>
  extractFileTasks(withMetaInfo(parse(content)), '/habits.org');

const api = {
  core: {
    useFileContent: () => ({ read: readFile, write: writeFile }),
  },
  ui: {
    useConfirmationModal: () => ({ confirm: confirmCompletion }),
  },
} as unknown as OrgNoteApi;

beforeEach(() => {
  const task = parseTasks(HABIT_CONTENT)[0]!;
  tasksStore.allFiles = [{ id: 'habits', filePath: ['habits.org'], tasks: [task] }];
  loadFiles.mockReset();
  loadFiles.mockResolvedValue(undefined);
  readFile.mockReset();
  readFile.mockResolvedValue(textToUint8Array(HABIT_CONTENT));
  writeFile.mockReset();
  writeFile.mockResolvedValue(undefined);
  confirmCompletion.mockReset();
  confirmCompletion.mockResolvedValue(true);
});

test('Pomodoro completion keeps a repeating task classified as a habit', async () => {
  const task = tasksStore.allFiles[0]!.tasks![0]!;

  const result = await completePomodoroTaskAfterConfirmation(
    api,
    {
      taskId: task.id,
      taskText: task.text,
      filePath: '/habits.org',
      taskStart: task.start!,
    },
    new Date(2026, 4, 18, 12, 0),
  );

  const writtenContent = uint8ArrayToText(writeFile.mock.calls[0]![1] as Uint8Array);
  const completedTask = parseTasks(writtenContent)[0];

  expect(result).toBe('completed');
  expect(completedTask?.isHabit).toBe(true);
});
