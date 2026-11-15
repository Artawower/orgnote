import { expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { POMODORO_LAST_TASK_KEY } from '../constants';
import {
  getActiveSessionPayload,
  mockConfirm,
  mockFileRead,
  mockFileWrite,
  mockGetExtensionConfig,
  mockKvDelete,
  mockKvGet,
  mockKvSet,
  mockUint8,
  orgTaskContent,
  POMODORO_ACTIVE_SESSION_KEY,
  setAgendaTask,
  TASK,
  tickSec,
  usePomodoroStore,
} from './pomodoro-store.test-fixture';

test('restoreSession_running_noDuplicateInterval_afterPause', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  tickSec(5);
  expect(store.elapsed).toBe(5);

  const kvSnapshot = (mockKvSet.mock.calls.at(-1) as [string, string])[1];
  mockKvGet.mockResolvedValue(kvSnapshot);

  await store.restoreSession();

  await store.pauseSession();
  const frozen = store.elapsed;

  tickSec(5);

  expect(store.elapsed).toBe(frozen);
});

test('stopSession_resetsSessionAndKeepsTaskSelectedBeforeClockWriteFinishes', async () => {
  let resolveRead: ((value: Uint8Array) => void) | undefined;
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  mockKvGet.mockResolvedValue(getActiveSessionPayload());
  mockFileRead.mockReturnValueOnce(
    new Promise<Uint8Array>((resolve) => {
      resolveRead = resolve;
    }),
  );

  const stopPromise = store.stopSession();

  expect(store.hasSession).toBe(false);
  expect(store.elapsed).toBe(0);
  expect(store.selectedTask?.id).toBe(TASK.id);
  if (!resolveRead) throw new Error('read resolver missing');
  resolveRead(mockUint8);
  await stopPromise;
});

test('stopSession_clearsPersistedSession_whenStoredSessionMatches', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  mockKvGet.mockResolvedValue(getActiveSessionPayload());

  await store.stopSession();

  expect(mockKvDelete).toHaveBeenCalledWith(POMODORO_ACTIVE_SESSION_KEY);
});

test('stopSession_keepsNewSessionStartedDuringClockWrite', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  mockKvGet.mockResolvedValue(getActiveSessionPayload());
  mockFileRead.mockImplementationOnce(async () => {
    await store.startSession({ ...TASK, id: 't2', text: 'Next task' }, 'pomo');
    return mockUint8;
  });

  await store.stopSession();

  expect(mockKvDelete).not.toHaveBeenCalledWith(POMODORO_ACTIVE_SESSION_KEY);
  expect(store.session?.taskId).toBe('t2');
});

test('stopSession_whenPaused_doesNotWriteExtraClock', async () => {
  const { appendClock } = await import('../mutations/clock');
  const store = usePomodoroStore();

  await store.startSession(TASK, 'pomo');
  tickSec(5);

  await store.pauseSession();
  const clockCallsAfterPause = vi.mocked(appendClock).mock.calls.length;

  await store.stopSession();

  expect(vi.mocked(appendClock).mock.calls.length).toBe(clockCallsAfterPause);
});

test('restoreSession_paused_doesNotStartTick', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  tickSec(10);
  await store.pauseSession();

  const pausedKv = (mockKvSet.mock.calls.at(-1) as [string, string])[1];
  mockKvGet.mockResolvedValue(pausedKv);
  setActivePinia(createPinia());
  const freshStore = usePomodoroStore();

  await freshStore.restoreSession();
  const frozen = freshStore.elapsed;

  tickSec(5);

  expect(freshStore.elapsed).toBe(frozen);
  expect(freshStore.isPaused).toBe(true);
});

test('restoreSession_corruptJson_doesNotThrowAndClearsKv', async () => {
  mockKvGet.mockResolvedValue('{invalid json{');
  const store = usePomodoroStore();

  await expect(store.restoreSession()).resolves.not.toThrow();
  expect(store.hasSession).toBe(false);
  expect(mockKvDelete).toHaveBeenCalled();
});

test('loadLastTask_corruptJson_returnsNullAndClearsKv', async () => {
  mockKvGet.mockResolvedValue('{invalid json{');
  const store = usePomodoroStore();

  const result = await store.loadLastTask();

  expect(result).toBeNull();
  expect(mockKvDelete).toHaveBeenCalledWith(POMODORO_LAST_TASK_KEY);
});

test('durationMin_initializesFromAgendaConfig_pomoDuration', () => {
  mockGetExtensionConfig.mockReturnValue({ value: { pomoDuration: 42 } });
  const store = usePomodoroStore();

  expect(store.durationMin).toBe(42);
});

test('elapsedPomodoro_keepsSelectedTask_whenCompletionDeclined', async () => {
  setAgendaTask();
  mockFileRead.mockResolvedValue(orgTaskContent);
  mockConfirm.mockResolvedValue(false);
  const store = usePomodoroStore();
  store.durationMin = 1;

  await store.startSession(TASK, 'pomo');
  await vi.advanceTimersByTimeAsync(60_000);

  expect(store.hasSession).toBe(false);
  expect(store.selectedTask?.id).toBe(TASK.id);
});

test('elapsedPomodoro_clearsSelectedTask_whenCompletionConfirmed', async () => {
  setAgendaTask();
  mockFileRead.mockResolvedValue(orgTaskContent);
  mockConfirm.mockResolvedValue(true);
  const store = usePomodoroStore();
  store.durationMin = 1;

  await store.startSession(TASK, 'pomo');
  await vi.advanceTimersByTimeAsync(60_000);

  expect(store.selectedTask).toBeNull();
  expect(mockFileWrite).toHaveBeenCalledOnce();
});
