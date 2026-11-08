import { DefaultCommands, type Command, type OrgNoteApi } from 'orgnote-api';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  AGENDA_HABITS_COMMAND,
  AGENDA_HABITS_URI,
  AGENDA_POMODORO_COMMAND,
  AGENDA_POMODORO_STATS_COMMAND,
  AGENDA_POMODORO_STATS_URI,
  AGENDA_POMODORO_URI,
  AGENDA_POMODORO_SET_POMO_COMMAND,
  AGENDA_POMODORO_SET_STOPWATCH_COMMAND,
  AGENDA_POMODORO_PAUSE_COMMAND,
  AGENDA_POMODORO_RESUME_COMMAND,
  AGENDA_POMODORO_STOP_COMMAND,
  AGENDA_TASK_ADD_TIME_COMMAND,
  AGENDA_TASK_CONTEXT_MENU_GROUP,
  AGENDA_TASKS_VIEWER_ID,
} from './constants';
import { orgAgendaExtension } from './index';

const timerStore = vi.hoisted(() => ({
  sessionType: 'pomo' as 'pomo' | 'stopwatch',
  isRunning: true,
  isPaused: false,
  hasSession: true,
  isTransitioning: false,
  changeSessionType: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
}));

vi.mock('./stores/pomodoro-store', () => ({
  usePomodoroStore: () => timerStore,
}));

const addedCommands: Command[] = [];
const execute = vi.fn();
const open = vi.fn();
const register = vi.fn();
const addContextMenuAction = vi.fn();
const registerContextMenuGroup = vi.fn();

const api = {
  core: {
    useBufferViewer: () => ({ open, register }),
    useCommands: () => ({ add: (...commands: Command[]) => addedCommands.push(...commands), execute }),
    usePane: () => ({ afterBufferActivated: vi.fn(() => vi.fn()) }),
  },
  ui: {
    useContextMenu: () => ({
      addContextMenuAction,
      registerGroup: registerContextMenuGroup,
    }),
    usePinnedCommands: () => ({ addCommand: vi.fn() }),
  },
} as unknown as OrgNoteApi;

beforeEach(() => {
  addedCommands.length = 0;
  execute.mockReset();
  open.mockReset();
  register.mockReset();
  addContextMenuAction.mockReset();
  registerContextMenuGroup.mockReset();
  timerStore.sessionType = 'pomo';
  timerStore.isRunning = true;
  timerStore.isPaused = false;
  timerStore.hasSession = true;
  timerStore.isTransitioning = false;
  timerStore.changeSessionType.mockReset();
  timerStore.pauseSession.mockReset();
  timerStore.resumeSession.mockReset();
});

test('Agenda Tasks viewer enables versioned view state', async () => {
  await orgAgendaExtension.onMounted!(api);

  expect(register).toHaveBeenCalledWith(
    expect.objectContaining({
      meta: expect.objectContaining({
        id: AGENDA_TASKS_VIEWER_ID,
        viewState: { version: 1 },
      }),
    }),
  );
});

test('manual time command is registered in the task context menu', async () => {
  await orgAgendaExtension.onMounted!(api);

  expect(addedCommands).toContainEqual(
    expect.objectContaining({ command: AGENDA_TASK_ADD_TIME_COMMAND }),
  );
  expect(addContextMenuAction).toHaveBeenCalledWith(AGENDA_TASK_CONTEXT_MENU_GROUP, {
    command: AGENDA_TASK_ADD_TIME_COMMAND,
  });
});

test('timer mode commands remain available during active sessions', async () => {
  await orgAgendaExtension.onMounted!(api);
  const pomodoroCommand = addedCommands.find(
    ({ command }) => command === AGENDA_POMODORO_SET_POMO_COMMAND,
  )!;
  const stopwatchCommand = addedCommands.find(
    ({ command }) => command === AGENDA_POMODORO_SET_STOPWATCH_COMMAND,
  )!;

  await pomodoroCommand.handler(api, { data: undefined, meta: pomodoroCommand });
  await stopwatchCommand.handler(api, { data: undefined, meta: stopwatchCommand });

  expect(pomodoroCommand.disabled?.(api)).toBe(true);
  expect(stopwatchCommand.disabled?.(api)).toBe(false);

  timerStore.isTransitioning = true;

  expect(pomodoroCommand.disabled?.(api)).toBe(true);
  expect(stopwatchCommand.disabled?.(api)).toBe(true);
  expect(timerStore.changeSessionType).toHaveBeenNthCalledWith(1, 'pomo');
  expect(timerStore.changeSessionType).toHaveBeenNthCalledWith(2, 'stopwatch');
});

test('session commands reflect the active timer state', async () => {
  await orgAgendaExtension.onMounted!(api);
  const pauseCommand = addedCommands.find(
    ({ command }) => command === AGENDA_POMODORO_PAUSE_COMMAND,
  )!;
  const resumeCommand = addedCommands.find(
    ({ command }) => command === AGENDA_POMODORO_RESUME_COMMAND,
  )!;
  const stopCommand = addedCommands.find(
    ({ command }) => command === AGENDA_POMODORO_STOP_COMMAND,
  )!;

  expect(pauseCommand.disabled?.(api)).toBe(false);
  expect(resumeCommand.disabled?.(api)).toBe(true);
  expect(stopCommand.disabled?.(api)).toBe(false);

  timerStore.isRunning = false;
  timerStore.isPaused = true;

  expect(pauseCommand.disabled?.(api)).toBe(true);
  expect(resumeCommand.disabled?.(api)).toBe(false);
  expect(stopCommand.disabled?.(api)).toBe(false);

  timerStore.hasSession = false;

  expect(resumeCommand.disabled?.(api)).toBe(true);
  expect(stopCommand.disabled?.(api)).toBe(true);

  timerStore.hasSession = true;
  timerStore.isPaused = true;
  timerStore.isTransitioning = true;

  expect(pauseCommand.disabled?.(api)).toBe(true);
  expect(resumeCommand.disabled?.(api)).toBe(true);
  expect(stopCommand.disabled?.(api)).toBe(true);
});

test.each([
  [AGENDA_HABITS_COMMAND, AGENDA_HABITS_URI],
  [AGENDA_POMODORO_COMMAND, AGENDA_POMODORO_URI],
  [AGENDA_POMODORO_STATS_COMMAND, AGENDA_POMODORO_STATS_URI],
])('%s shows an existing buffer before opening another view', async (commandName, uri) => {
  await orgAgendaExtension.onMounted!(api);
  const command = addedCommands.find(({ command }) => command === commandName)!;

  await command.handler(api, { data: undefined, meta: command });

  expect(execute).toHaveBeenCalledWith(DefaultCommands.SHOW_OR_OPEN_BUFFER, { uri });
  expect(open).not.toHaveBeenCalled();
});
