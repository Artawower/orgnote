import { expect, test, vi } from 'vitest';
import {
  mockFileRead,
  mockFileWrite,
  mockKvSet,
  NEXT_TASK,
  TASK,
  tickSec,
  usePomodoroStore,
} from './pomodoro-store.test-fixture';

test('startSession_keepsOnlyOneIntervalAcrossConcurrentStarts', async () => {
  let resolvePersist: (() => void) | undefined;
  mockKvSet.mockReturnValueOnce(
    new Promise<void>((resolve) => {
      resolvePersist = resolve;
    }),
  );
  const store = usePomodoroStore();

  const firstStart = store.startSession(TASK, 'pomo');
  await store.startSession(NEXT_TASK, 'stopwatch');
  resolvePersist!();
  await firstStart;

  expect(vi.getTimerCount()).toBe(1);
});

test('pauseSession_setsIsPaused_true', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await store.pauseSession();

  expect(store.isPaused).toBe(true);
});

test('pauseSession_writesClockEntry', async () => {
  const { appendClock } = await import('../mutations/clock');
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await store.pauseSession();

  expect(vi.mocked(appendClock)).toHaveBeenCalledOnce();
});

test('pauseSession_stopsElapsed_afterPause', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  tickSec(10);
  expect(store.elapsed).toBe(10);

  await store.pauseSession();
  const frozen = store.elapsed;

  tickSec(5);

  expect(store.elapsed).toBe(frozen);
});

test('resumeSession_afterPause_continuesElapsed', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  tickSec(10);
  await store.pauseSession();
  const elapsedAtPause = store.elapsed;

  tickSec(5);

  await store.resumeSession();
  tickSec(3);

  expect(store.elapsed).toBeGreaterThan(elapsedAtPause);
  expect(store.isPaused).toBe(false);
});

test('pauseSession_accumulatesSeconds_acrossSegments', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  tickSec(10);
  await store.pauseSession();

  await store.resumeSession();
  tickSec(5);

  expect(store.elapsed).toBeGreaterThanOrEqual(15);
});

test('changeTask_keepsRunningSessionElapsedAndClocksPreviousTask', async () => {
  const { appendClock } = await import('../mutations/clock');
  vi.mocked(appendClock).mockImplementationOnce((content) => `${content}CLOCK`);
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  tickSec(10);

  await store.changeTask(NEXT_TASK);

  expect(vi.mocked(appendClock)).toHaveBeenCalledOnce();
  expect(store.session?.taskId).toBe(NEXT_TASK.id);
  expect(store.elapsed).toBeGreaterThanOrEqual(10);
  tickSec(2);
  expect(store.elapsed).toBeGreaterThanOrEqual(12);
});

test('changeTask_blocksPauseUntilTaskTransitionCompletes', async () => {
  const { appendClock } = await import('../mutations/clock');
  let resolveRead: ((value: Uint8Array) => void) | undefined;
  mockFileRead.mockReturnValueOnce(
    new Promise<Uint8Array>((resolve) => {
      resolveRead = resolve;
    }),
  );
  vi.mocked(appendClock)
    .mockImplementationOnce((content) => `${content}CLOCK`)
    .mockImplementationOnce((content) => `${content}CLOCK`);
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  tickSec(5);

  const changePromise = store.changeTask(NEXT_TASK);
  await store.pauseSession();
  resolveRead!(new TextEncoder().encode('task'));
  await changePromise;

  expect(vi.mocked(appendClock)).toHaveBeenCalledOnce();
  expect(store.session?.taskId).toBe(NEXT_TASK.id);
  expect(store.elapsed).toBe(5);
  expect(store.isPaused).toBe(false);
});

test('changeTask_blocksStopUntilTaskTransitionCompletes', async () => {
  const { appendClock } = await import('../mutations/clock');
  let resolveRead: ((value: Uint8Array) => void) | undefined;
  mockFileRead.mockReturnValueOnce(
    new Promise<Uint8Array>((resolve) => {
      resolveRead = resolve;
    }),
  );
  vi.mocked(appendClock)
    .mockImplementationOnce((content) => `${content}CLOCK`)
    .mockImplementationOnce((content) => `${content}CLOCK`);
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  const changePromise = store.changeTask(NEXT_TASK);
  await store.stopSession();
  resolveRead!(new TextEncoder().encode('task'));
  await changePromise;

  expect(vi.mocked(appendClock)).toHaveBeenCalledOnce();
  expect(store.session?.taskId).toBe(NEXT_TASK.id);
});

test('changeTask_whilePausedDoesNotWriteAnotherClock', async () => {
  const { appendClock } = await import('../mutations/clock');
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  tickSec(5);
  await store.pauseSession();
  const clockCount = vi.mocked(appendClock).mock.calls.length;

  await store.changeTask(NEXT_TASK);

  expect(vi.mocked(appendClock)).toHaveBeenCalledTimes(clockCount);
  expect(store.session?.taskId).toBe(NEXT_TASK.id);
  expect(store.isPaused).toBe(true);
});

test('changeTask_adjustsLaterTaskPositionAfterClockInsertion', async () => {
  const { appendClock } = await import('../mutations/clock');
  const fileContent = 'x'.repeat(400);
  mockFileRead.mockResolvedValueOnce(new TextEncoder().encode(fileContent));
  vi.mocked(appendClock).mockImplementationOnce(
    (content) => `${content.slice(0, 100)}CLOCK${content.slice(100)}`,
  );
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await store.changeTask(NEXT_TASK);

  expect(store.session?.taskStart).toBe(NEXT_TASK.start + 'CLOCK'.length);
});

test('changeTask_recoversTransitionStateWhenClockMutationThrows', async () => {
  const { appendClock } = await import('../mutations/clock');
  vi.mocked(appendClock).mockImplementationOnce(() => {
    throw new Error('clock mutation failed');
  });
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await expect(store.changeTask(NEXT_TASK)).resolves.not.toThrow();

  expect(store.isTransitioning).toBe(false);
  expect(store.session?.taskId).toBe(TASK.id);
  tickSec(2);
  expect(store.elapsed).toBeGreaterThanOrEqual(2);
});

test('changeTask_keepsCurrentTaskWhenClockWriteFails', async () => {
  const { appendClock } = await import('../mutations/clock');
  const fileContent = 'x'.repeat(400);
  mockFileRead.mockResolvedValueOnce(new TextEncoder().encode(fileContent));
  mockFileWrite.mockRejectedValueOnce(new Error('write failed'));
  vi.mocked(appendClock).mockImplementationOnce(
    (content) => `${content.slice(0, 100)}CLOCK${content.slice(100)}`,
  );
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await store.changeTask(NEXT_TASK);

  expect(store.session?.taskId).toBe(TASK.id);
  tickSec(2);
  expect(store.elapsed).toBeGreaterThanOrEqual(2);
});

test('changeSessionType_preservesElapsedAndPersistsActiveSession', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  tickSec(10);
  const elapsedBeforeChange = store.elapsed;

  await store.changeSessionType('stopwatch');

  expect(store.sessionType).toBe('stopwatch');
  expect(store.session?.type).toBe('stopwatch');
  expect(store.elapsed).toBe(elapsedBeforeChange);
  expect(mockKvSet.mock.calls.at(-1)?.[1]).toContain('"type":"stopwatch"');
});

test('changeDuration_updatesAndPersistsActivePomodoroDuration', async () => {
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');

  await store.changeDuration(45);

  expect(store.durationMin).toBe(45);
  expect(store.session?.duration).toBe(45);
  expect(mockKvSet.mock.calls.at(-1)?.[1]).toContain('"duration":45');
});

test('shorteningElapsedPomodoro_closesClockAtCurrentTime', async () => {
  const { appendClock } = await import('../mutations/clock');
  const store = usePomodoroStore();
  await store.startSession(TASK, 'pomo');
  await vi.advanceTimersByTimeAsync(120_000);
  await store.changeDuration(1);
  const changedAt = Date.now();

  await vi.advanceTimersByTimeAsync(1_000);

  const endedAt = vi.mocked(appendClock).mock.calls.at(-1)?.[3];
  expect(endedAt?.getTime()).toBeGreaterThanOrEqual(changedAt);
});

