import type { CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { beforeEach, expect, test, vi } from 'vitest';
import { AGENDA_POMODORO_URI } from '../constants';
import { createStartSessionHandler } from './start-session';
import { startPomodoroCommand } from './start-pomodoro-command';
import { startStopwatchCommand } from './start-stopwatch-command';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  openTaskCompletion: vi.fn(),
  showOrOpen: vi.fn(),
  startSession: vi.fn(),
  stopSession: vi.fn(),
  store: {
    hasSession: false,
    isTransitioning: false,
    selectedTask: null as unknown,
    sessionType: 'pomo' as 'pomo' | 'stopwatch',
  },
}));

vi.mock('../stores/pomodoro-store', () => ({
  usePomodoroStore: () => ({
    ...mocks.store,
    openTaskCompletion: mocks.openTaskCompletion,
    startSession: mocks.startSession,
    stopSession: mocks.stopSession,
  }),
}));

vi.mock('src/composables/use-confirmation-modal', () => ({
  useConfirmationModal: () => ({ confirm: mocks.confirm }),
}));

vi.mock('src/boot/i18n', () => ({
  i18n: { global: { t: (key: string) => key } },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.store.hasSession = false;
  mocks.store.isTransitioning = false;
  mocks.store.selectedTask = null;
  mocks.store.sessionType = 'pomo';
  mocks.showOrOpen.mockResolvedValue(undefined);
  mocks.startSession.mockResolvedValue(undefined);
});

test('start session focuses an open Pomodoro buffer before starting', async () => {
  const task = { id: 'task-1', filePath: '/notes/tasks.org' };
  const api = {
    core: { useBufferViewer: () => ({ showOrOpen: mocks.showOrOpen }) },
  } as unknown as OrgNoteApi;
  const handler = createStartSessionHandler((store) => store.sessionType);

  await handler(api, { data: task } as unknown as CommandHandlerParams);

  expect(mocks.showOrOpen).toHaveBeenCalledWith(AGENDA_POMODORO_URI);
  expect(mocks.startSession).toHaveBeenCalledWith(task, 'pomo');
  expect(mocks.showOrOpen.mock.invocationCallOrder[0]!).toBeLessThan(
    mocks.startSession.mock.invocationCallOrder[0]!,
  );
});

test('start commands are disabled during a task transition', () => {
  mocks.store.isTransitioning = true;
  const api = {} as OrgNoteApi;

  expect(startPomodoroCommand.disabled?.(api)).toBe(true);
  expect(startStopwatchCommand.disabled?.(api)).toBe(true);
});

test('start commands always use the mode named by their action', async () => {
  const task = { id: 'task-1', filePath: '/notes/tasks.org' };
  const api = {
    core: { useBufferViewer: () => ({ showOrOpen: mocks.showOrOpen }) },
  } as unknown as OrgNoteApi;
  mocks.store.sessionType = 'stopwatch';

  await startPomodoroCommand.handler(api, { data: task, meta: startPomodoroCommand });
  await startStopwatchCommand.handler(api, { data: task, meta: startStopwatchCommand });

  expect(mocks.startSession).toHaveBeenNthCalledWith(1, task, 'pomo');
  expect(mocks.startSession).toHaveBeenNthCalledWith(2, task, 'stopwatch');
});
